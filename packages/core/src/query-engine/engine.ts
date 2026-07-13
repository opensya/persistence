import type {
  DatabaseAdapter,
  QueryFilter,
  QueryParams,
} from "../adapter/types.js";
import { hasFilterConstraints } from "../adapter/types.js";
import type { AuditManager } from "../audit/manager.js";
import { DomainEventCollector } from "../events/collector.js";
import type { DomainEventEmitter, OutboxWriter } from "../events/types.js";
import { HooksRegistry } from "../hooks/registry.js";
import type { HookContext, MutationOperation } from "../hooks/types.js";
import type { MetadataRegistry } from "../metadata/registry.js";
import type {
  RegisteredTableName,
  ResolveEntityType,
  TableMetadataMap,
} from "../metadata/inference.js";
import type { ColumnMetadata, TableMetadata } from "../metadata/types.js";
import { MigrationManager } from "../migrations/manager.js";
import { RelationResolver } from "../relations/resolver.js";
import { SchemaManager } from "../sync/schema-manager.js";
import { FieldSerializer } from "./serializer.js";
import { CursorCodec } from "./cursor.js";
import {
  UnsafeMutationError,
  ValidationError,
  type FieldValidationFailure,
  type QueryContextInput,
} from "./types.js";

export interface EngineQueryParams extends QueryParams {
  populate?: string[];
  context?: QueryContextInput;
}

export interface CursorPaginationParams
  extends Omit<EngineQueryParams, "limit" | "offset"> {
  first?: number;
  after?: string;
}

export interface CursorPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface CursorPage<T> {
  data: T[];
  pageInfo: CursorPageInfo;
}

export class QueryEngine<
  TEvents extends object = Record<string, unknown>,
  TTables extends TableMetadataMap = Record<never, never>,
> {
  readonly schema: SchemaManager;
  readonly migrations: MigrationManager;

  constructor(
    private readonly registry: MetadataRegistry<TTables>,
    private readonly adapter: DatabaseAdapter,
    private readonly hooks = new HooksRegistry(),
    private readonly serializer = new FieldSerializer(registry),
    private readonly audit?: AuditManager,
    private readonly outbox?: OutboxWriter,
    private readonly cursor = new CursorCodec(),
  ) {
    this.schema = new SchemaManager(registry, adapter);
    this.migrations = new MigrationManager(registry, adapter);
  }

  transaction<TResult>(
    context: QueryContextInput,
    callback: (
      engine: TransactionalQueryEngine<TEvents, TTables>,
    ) => Promise<TResult>,
  ): Promise<TResult> {
    return this.adapter.transaction(async (tx) => {
      const collector = new DomainEventCollector<TEvents>(context);
      const engine = new TransactionalQueryEngine<TEvents, TTables>(
        this.registry,
        tx,
        this.hooks,
        this.serializer,
        this.audit,
        this.outbox,
        collector,
      );
      const result = await callback(engine);
      const events = collector.getPendingEvents();

      if (events.length && !this.outbox) {
        throw new Error(
          "Domain events were emitted but no OutboxWriter is configured.",
        );
      }
      if (events.length) await this.outbox?.write(events, tx);
      return result;
    });
  }

  async findMany<
    T = never,
    TName extends RegisteredTableName<TTables> = RegisteredTableName<TTables>,
  >(
    tableName: TName,
    params: EngineQueryParams = {},
  ): Promise<ResolveEntityType<T, TTables, TName>[]> {
    this.registry.getOrThrow(tableName);
    const { populate, context = {}, ...query } = params;
    const rows = await this.adapter.findMany<Record<string, unknown>>(
      tableName,
      query,
    );

    const populated = populate?.length
      ? await new RelationResolver(this.registry, this.adapter).populate(
          tableName,
          rows,
          populate,
        )
      : rows;

    return this.serializer.serializeMany(
      tableName,
      populated,
      context,
    ) as Promise<ResolveEntityType<T, TTables, TName>[]>;
  }

  async findPage<
    T = never,
    TName extends RegisteredTableName<TTables> = RegisteredTableName<TTables>,
  >(
    tableName: TName,
    params: CursorPaginationParams = {},
  ): Promise<CursorPage<ResolveEntityType<T, TTables, TName>>> {
    const table = this.registry.getOrThrow(tableName);
    const {
      first = 50,
      after,
      populate,
      context = {},
      orderBy: requestedOrder,
      where,
    } = params;
    this.assertPageSize(first);

    const orderBy = this.cursor.normalizeOrder(table, requestedOrder);
    const cursorFilter = after
      ? this.cursor.buildAfterFilter(
          orderBy,
          this.cursor.decode(after, orderBy),
        )
      : undefined;
    const mergedWhere = cursorFilter
      ? where
        ? { and: [where, cursorFilter] }
        : cursorFilter
      : where;
    const rows = await this.adapter.findMany<Record<string, unknown>>(
      tableName,
      {
        where: mergedWhere,
        orderBy,
        limit: first + 1,
      },
    );
    const hasNextPage = rows.length > first;
    const pageRows = hasNextPage ? rows.slice(0, first) : rows;
    const lastRow = pageRows.at(-1);
    const populated = populate?.length
      ? await new RelationResolver(this.registry, this.adapter).populate(
          tableName,
          pageRows,
          populate,
        )
      : pageRows;
    const data = await this.serializer.serializeMany(
      tableName,
      populated,
      context,
    );

    return {
      data: data as ResolveEntityType<T, TTables, TName>[],
      pageInfo: {
        hasNextPage,
        endCursor: lastRow ? this.cursor.encode(orderBy, lastRow) : null,
      },
    };
  }

  async findOne<
    T = never,
    TName extends RegisteredTableName<TTables> = RegisteredTableName<TTables>,
  >(
    tableName: TName,
    params: EngineQueryParams = {},
  ): Promise<ResolveEntityType<T, TTables, TName> | null> {
    this.registry.getOrThrow(tableName);
    const { populate, context = {}, ...query } = params;
    const row = await this.adapter.findOne<Record<string, unknown>>(
      tableName,
      query,
    );
    if (!row) return null;

    let populated: Record<string, unknown> = row;
    if (populate?.length) {
      const [firstPopulated] = await new RelationResolver(
        this.registry,
        this.adapter,
      ).populate(tableName, [row], populate);
      populated = firstPopulated ?? row;
    }

    return this.serializer.serializeOne(
      tableName,
      populated,
      context,
    ) as Promise<ResolveEntityType<T, TTables, TName>>;
  }

  create<
    T = never,
    TName extends RegisteredTableName<TTables> = RegisteredTableName<TTables>,
  >(
    tableName: TName,
    data: Record<string, unknown>,
    context: QueryContextInput = {},
  ): Promise<ResolveEntityType<T, TTables, TName>> {
    const table = this.registry.getOrThrow(tableName);

    return this.adapter.transaction(async (tx) => {
      const hookContext = this.createHookContext(table, "create", tx, context);
      const withDefaults = await this.applyDefaults(table, data);
      const resolved = await this.hooks.runBeforeCreate(
        tableName,
        withDefaults,
        hookContext,
      );

      this.assertKnownFields(table, resolved);
      await this.assertValid(table, resolved);
      const transformed = await this.transformFields(
        table,
        resolved,
        "create",
        context,
      );

      const entity = await tx.insert<Record<string, unknown>>(
        tableName,
        transformed,
      );
      await this.hooks.runAfterCreate(tableName, entity, hookContext);
      await this.audit?.record({
        operation: "create",
        table,
        before: null,
        after: entity,
        context,
        adapter: tx,
      });
      return this.serializer.serializeOne(
        tableName,
        entity,
        context,
      ) as Promise<ResolveEntityType<T, TTables, TName>>;
    });
  }

  updateOne<
    T = never,
    TName extends RegisteredTableName<TTables> = RegisteredTableName<TTables>,
  >(
    tableName: TName,
    where: QueryFilter,
    patch: Record<string, unknown>,
    context: QueryContextInput = {},
  ): Promise<ResolveEntityType<T, TTables, TName> | null> {
    this.assertSafeMutation("update", tableName, where);
    const table = this.registry.getOrThrow(tableName);

    return this.adapter.transaction(async (tx) => {
      const current = await tx.findOne<Record<string, unknown>>(tableName, {
        where,
      });
      if (!current) return null;

      const hookContext = this.createHookContext(table, "update", tx, context);
      const resolvedPatch = await this.hooks.runBeforeUpdate(
        tableName,
        patch,
        hookContext,
      );
      this.assertKnownFields(table, resolvedPatch);

      const merged = { ...current, ...resolvedPatch };
      await this.assertValid(table, merged, Object.keys(resolvedPatch));
      const transformedPatch = await this.transformFields(
        table,
        resolvedPatch,
        "update",
        context,
      );

      const primaryKeyFilter = this.createPrimaryKeyFilter(table, current);
      const [updated] = await tx.update<Record<string, unknown>>(
        tableName,
        primaryKeyFilter,
        transformedPatch,
      );
      if (!updated) return null;

      await this.hooks.runAfterUpdate(tableName, updated, hookContext);
      await this.audit?.record({
        operation: "update",
        table,
        before: current,
        after: updated,
        context,
        adapter: tx,
      });
      return this.serializer.serializeOne(
        tableName,
        updated,
        context,
      ) as Promise<ResolveEntityType<T, TTables, TName>>;
    });
  }

  updateMany<
    T = never,
    TName extends RegisteredTableName<TTables> = RegisteredTableName<TTables>,
  >(
    tableName: TName,
    where: QueryFilter,
    patch: Record<string, unknown>,
    context: QueryContextInput = {},
  ): Promise<ResolveEntityType<T, TTables, TName>[]> {
    this.assertSafeMutation("update", tableName, where);
    const table = this.registry.getOrThrow(tableName);

    return this.adapter.transaction(async (tx) => {
      const currentRows = await tx.findMany<Record<string, unknown>>(
        tableName,
        {
          where,
        },
      );
      if (!currentRows.length) return [];

      const hookContext = this.createHookContext(table, "update", tx, context);
      const resolvedPatch = await this.hooks.runBeforeUpdate(
        tableName,
        patch,
        hookContext,
      );
      this.assertKnownFields(table, resolvedPatch);

      const touchedFields = Object.keys(resolvedPatch);
      for (const current of currentRows) {
        await this.assertValid(
          table,
          { ...current, ...resolvedPatch },
          touchedFields,
        );
      }
      const transformedPatch = await this.transformFields(
        table,
        resolvedPatch,
        "update",
        context,
      );

      const updatedRows = await tx.update<Record<string, unknown>>(
        tableName,
        where,
        transformedPatch,
      );
      for (const updated of updatedRows) {
        await this.hooks.runAfterUpdate(tableName, updated, hookContext);
      }
      for (const [index, updated] of updatedRows.entries()) {
        const current = this.findMatchingEntity(table, currentRows, updated);
        await this.audit?.record({
          operation: "update",
          table,
          before: current ?? currentRows[index] ?? null,
          after: updated,
          context,
          adapter: tx,
        });
      }
      return this.serializer.serializeMany(
        tableName,
        updatedRows,
        context,
      ) as Promise<ResolveEntityType<T, TTables, TName>[]>;
    });
  }

  deleteOne(
    tableName: string,
    where: QueryFilter,
    context: QueryContextInput = {},
  ): Promise<boolean> {
    this.assertSafeMutation("delete", tableName, where);
    const table = this.registry.getOrThrow(tableName);

    return this.adapter.transaction(async (tx) => {
      const current = await tx.findOne<Record<string, unknown>>(tableName, {
        where,
      });
      if (!current) return false;

      const hookContext = this.createHookContext(table, "delete", tx, context);
      const primaryKeyFilter = this.createPrimaryKeyFilter(table, current);
      await this.hooks.runBeforeDelete(
        tableName,
        primaryKeyFilter,
        hookContext,
      );
      const count = await tx.delete(tableName, primaryKeyFilter);
      await this.hooks.runAfterDelete(tableName, hookContext);
      if (count > 0) {
        await this.audit?.record({
          operation: "delete",
          table,
          before: current,
          after: null,
          context,
          adapter: tx,
        });
      }
      return count > 0;
    });
  }

  deleteMany(
    tableName: string,
    where: QueryFilter,
    context: QueryContextInput = {},
  ): Promise<number> {
    this.assertSafeMutation("delete", tableName, where);
    const table = this.registry.getOrThrow(tableName);

    return this.adapter.transaction(async (tx) => {
      const currentRows = this.audit?.isEnabled(table)
        ? await tx.findMany<Record<string, unknown>>(tableName, { where })
        : [];
      const hookContext = this.createHookContext(table, "delete", tx, context);
      await this.hooks.runBeforeDelete(tableName, where, hookContext);
      const count = await tx.delete(tableName, where);
      await this.hooks.runAfterDelete(tableName, hookContext);
      for (const current of currentRows) {
        await this.audit?.record({
          operation: "delete",
          table,
          before: current,
          after: null,
          context,
          adapter: tx,
        });
      }
      return count;
    });
  }

  private async applyDefaults(
    table: TableMetadata,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result = { ...data };
    for (const column of table.columns) {
      if (result[column.name] !== undefined || column.default === undefined) {
        continue;
      }
      result[column.name] =
        typeof column.default === "function"
          ? await column.default()
          : column.default;
    }
    return result;
  }

  private async transformFields(
    table: TableMetadata,
    data: Record<string, unknown>,
    operation: "create" | "update",
    context: QueryContextInput,
  ): Promise<Record<string, unknown>> {
    const result = { ...data };

    for (const column of table.columns) {
      if (!column.transform || !(column.name in data)) continue;

      result[column.name] = await column.transform(data[column.name], {
        operation,
        field: column.name,
        table: table.name,
        entity: data,
        user: context.user,
        ...(context.requestId !== undefined && {
          requestId: context.requestId,
        }),
        ...(context.tenantId !== undefined && { tenantId: context.tenantId }),
      });
    }

    return result;
  }

  private async assertValid(
    table: TableMetadata,
    entity: Readonly<Record<string, unknown>>,
    onlyFields?: string[],
  ): Promise<void> {
    const failures = await this.validateEntity(table, entity, onlyFields);
    if (failures.length) throw new ValidationError(table.name, failures);
  }

  private async validateEntity(
    table: TableMetadata,
    entity: Readonly<Record<string, unknown>>,
    onlyFields?: string[],
  ): Promise<FieldValidationFailure[]> {
    const failures: FieldValidationFailure[] = [];

    for (const column of table.columns) {
      if (onlyFields && !onlyFields.includes(column.name)) continue;
      const value = entity[column.name];

      const structuralFailure = this.validateColumnStructure(column, value);
      if (structuralFailure) failures.push(structuralFailure);

      for (const validator of column.validators) {
        const result = await validator.validate(value, entity);
        if (!result.valid) {
          failures.push({ field: column.name, message: result.message });
        }
      }
    }

    for (const validator of table.tableValidators) {
      if (
        onlyFields &&
        !validator.fields.some((field) => onlyFields.includes(field))
      ) {
        continue;
      }
      const result = await validator.validate(entity);
      if (!result.valid) {
        failures.push({
          field: validator.fields.join(","),
          message: result.message,
        });
      }
    }

    return failures;
  }

  private validateColumnStructure(
    column: ColumnMetadata,
    value: unknown,
  ): FieldValidationFailure | null {
    if (value === null || value === undefined) {
      return column.nullable
        ? null
        : { field: column.name, message: "This field is required." };
    }

    const valid = (() => {
      switch (column.type) {
        case "integer":
          return typeof value === "number" && Number.isInteger(value);
        case "bigint":
          return typeof value === "bigint";
        case "decimal":
          return typeof value === "string" || typeof value === "number";
        case "boolean":
          return typeof value === "boolean";
        case "timestamp":
          return value instanceof Date;
        case "json":
          return true;
        case "uuid":
        case "string":
        case "text":
        case "date":
          return typeof value === "string";
      }
    })();

    return valid
      ? null
      : { field: column.name, message: `Invalid ${column.type} value.` };
  }

  private assertKnownFields(
    table: TableMetadata,
    data: Record<string, unknown>,
  ): void {
    const known = new Set(table.columns.map((column) => column.name));
    for (const field of Object.keys(data)) {
      if (!known.has(field)) {
        throw new Error(`Unknown field "${field}" on table "${table.name}".`);
      }
    }
  }

  private createPrimaryKeyFilter(
    table: TableMetadata,
    entity: Record<string, unknown>,
  ): QueryFilter {
    const primaryKeys = table.columns.filter((column) => column.primaryKey);
    const conditions = primaryKeys.map((column) => {
      const value = entity[column.name];
      if (value === null || value === undefined) {
        throw new Error(
          `Cannot target "${table.name}": primary key "${column.name}" is missing.`,
        );
      }
      return { field: column.name, operator: "eq" as const, value };
    });
    return { conditions };
  }

  private findMatchingEntity(
    table: TableMetadata,
    entities: Record<string, unknown>[],
    target: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const primaryKeys = table.columns.filter((column) => column.primaryKey);
    return entities.find((entity) =>
      primaryKeys.every((column) =>
        Object.is(entity[column.name], target[column.name]),
      ),
    );
  }

  private assertSafeMutation(
    operation: "update" | "delete",
    tableName: string,
    where: QueryFilter,
  ): void {
    if (!hasFilterConstraints(where)) {
      throw new UnsafeMutationError(operation, tableName);
    }
  }

  private assertPageSize(first: number): void {
    if (!Number.isInteger(first) || first < 1 || first > 100) {
      throw new RangeError(
        'Cursor pagination parameter "first" must be an integer between 1 and 100.',
      );
    }
  }

  private createHookContext(
    table: TableMetadata,
    operation: MutationOperation,
    adapter: DatabaseAdapter,
    input: QueryContextInput,
  ): HookContext {
    return {
      ...input,
      table: table.name,
      operation,
      metadata: table,
      adapter,
    };
  }
}

export class TransactionalQueryEngine<
  TEvents extends object = Record<string, unknown>,
  TTables extends TableMetadataMap = Record<never, never>,
> extends QueryEngine<TEvents, TTables> {
  constructor(
    registry: MetadataRegistry<TTables>,
    adapter: DatabaseAdapter,
    hooks: HooksRegistry,
    serializer: FieldSerializer,
    audit: AuditManager | undefined,
    outbox: OutboxWriter | undefined,
    public readonly events: DomainEventEmitter<TEvents>,
  ) {
    super(registry, adapter, hooks, serializer, audit, outbox);
  }
}

export function createQueryEngine<
  TEvents extends object = Record<string, unknown>,
  TTables extends TableMetadataMap = Record<never, never>,
>({
  registry,
  adapter,
  hooks,
  serializer,
  audit,
  outbox,
}: {
  registry: MetadataRegistry<TTables>;
  adapter: DatabaseAdapter;
  hooks?: HooksRegistry;
  serializer?: FieldSerializer;
  audit?: AuditManager;
  outbox?: OutboxWriter;
}): QueryEngine<TEvents, TTables> {
  return new QueryEngine<TEvents, TTables>(
    registry,
    adapter,
    hooks,
    serializer,
    audit,
    outbox,
  );
}
