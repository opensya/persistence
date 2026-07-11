import type {
  DatabaseAdapter,
  QueryFilter,
  QueryParams,
} from "../adapter/types.js";
import { hasFilterConstraints } from "../adapter/types.js";
import { HooksRegistry } from "../hooks/registry.js";
import type { HookContext, MutationOperation } from "../hooks/types.js";
import type { MetadataRegistry } from "../metadata/registry.js";
import type { ColumnMetadata, TableMetadata } from "../metadata/types.js";
import { RelationResolver } from "../relations/resolver.js";
import { FieldSerializer } from "./serializer.js";
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

export class QueryEngine {
  constructor(
    private readonly registry: MetadataRegistry,
    private readonly adapter: DatabaseAdapter,
    private readonly hooks = new HooksRegistry(),
    private readonly serializer = new FieldSerializer(registry),
  ) {}

  async findMany<T = Record<string, unknown>>(
    tableName: string,
    params: EngineQueryParams = {},
  ): Promise<T[]> {
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
    ) as Promise<T[]>;
  }

  async findOne<T = Record<string, unknown>>(
    tableName: string,
    params: EngineQueryParams = {},
  ): Promise<T | null> {
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
    ) as Promise<T>;
  }

  create<T = Record<string, unknown>>(
    tableName: string,
    data: Record<string, unknown>,
    context: QueryContextInput = {},
  ): Promise<T> {
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

      const entity = await tx.insert<Record<string, unknown>>(
        tableName,
        resolved,
      );
      await this.hooks.runAfterCreate(tableName, entity, hookContext);
      return this.serializer.serializeOne(
        tableName,
        entity,
        context,
      ) as Promise<T>;
    });
  }

  updateOne<T = Record<string, unknown>>(
    tableName: string,
    where: QueryFilter,
    patch: Record<string, unknown>,
    context: QueryContextInput = {},
  ): Promise<T | null> {
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

      const primaryKeyFilter = this.createPrimaryKeyFilter(table, current);
      const [updated] = await tx.update<Record<string, unknown>>(
        tableName,
        primaryKeyFilter,
        resolvedPatch,
      );
      if (!updated) return null;

      await this.hooks.runAfterUpdate(tableName, updated, hookContext);
      return this.serializer.serializeOne(
        tableName,
        updated,
        context,
      ) as Promise<T>;
    });
  }

  updateMany<T = Record<string, unknown>>(
    tableName: string,
    where: QueryFilter,
    patch: Record<string, unknown>,
    context: QueryContextInput = {},
  ): Promise<T[]> {
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

      const updatedRows = await tx.update<Record<string, unknown>>(
        tableName,
        where,
        resolvedPatch,
      );
      for (const updated of updatedRows) {
        await this.hooks.runAfterUpdate(tableName, updated, hookContext);
      }
      return this.serializer.serializeMany(
        tableName,
        updatedRows,
        context,
      ) as Promise<T[]>;
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
      const hookContext = this.createHookContext(table, "delete", tx, context);
      await this.hooks.runBeforeDelete(tableName, where, hookContext);
      const count = await tx.delete(tableName, where);
      await this.hooks.runAfterDelete(tableName, hookContext);
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

  private assertSafeMutation(
    operation: "update" | "delete",
    tableName: string,
    where: QueryFilter,
  ): void {
    if (!hasFilterConstraints(where)) {
      throw new UnsafeMutationError(operation, tableName);
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

export function createQueryEngine(
  registry: MetadataRegistry,
  adapter: DatabaseAdapter,
  hooks?: HooksRegistry,
  serializer?: FieldSerializer,
): QueryEngine {
  return new QueryEngine(registry, adapter, hooks, serializer);
}
