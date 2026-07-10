import type { MetadataRegistry } from "../metadata/registry.js";
import type { TableMetadata } from "../metadata/types.js";
import type {
  DatabaseAdapter,
  QueryFilter,
  QueryParams,
} from "../adapter/types.js";
import { ValidationError, type FieldValidationFailure } from "./types.js";
import { HooksRegistry } from "../hooks/registry.js";
import { RelationResolver } from "../relations/resolver.js";

export interface EngineQueryParams extends QueryParams {
  populate?: string[];
}

export class QueryEngine {
  private readonly relationResolver: RelationResolver;
  private readonly hooks: HooksRegistry;

  constructor(
    private readonly registry: MetadataRegistry,
    private readonly adapter: DatabaseAdapter,
    hooks?: HooksRegistry,
  ) {
    this.relationResolver = new RelationResolver(registry, adapter);
    this.hooks = hooks ?? new HooksRegistry();
  }

  async findMany<T = Record<string, unknown>>(
    tableName: string,
    params: EngineQueryParams = {},
  ): Promise<T[]> {
    this.registry.getOrThrow(tableName);
    const { populate, ...dbParams } = params;

    const rows = await this.adapter.findMany<Record<string, unknown>>(
      tableName,
      dbParams,
    );
    const result = populate?.length
      ? await this.relationResolver.populate(tableName, rows, populate)
      : rows;
    return result as T[];
  }

  async findOne<T = Record<string, unknown>>(
    tableName: string,
    params: EngineQueryParams = {},
  ): Promise<T | null> {
    this.registry.getOrThrow(tableName);
    const { populate, ...dbParams } = params;

    const row = await this.adapter.findOne<Record<string, unknown>>(
      tableName,
      dbParams,
    );
    if (!row) return null;

    const [result] = populate?.length
      ? await this.relationResolver.populate(tableName, [row], populate)
      : [row];
    return result as T;
  }

  async create<T = Record<string, unknown>>(
    tableName: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    const table = this.registry.getOrThrow(tableName);
    const ctx = { table: tableName };

    const afterHooks = await this.hooks.runBeforeCreate(tableName, data, ctx);

    const failures = await this.validateEntity(table, afterHooks);
    if (failures.length > 0) throw new ValidationError(tableName, failures);

    const entity = await this.adapter.insert<Record<string, unknown>>(
      tableName,
      afterHooks,
    );
    await this.hooks.runAfterCreate(tableName, entity, ctx);

    return entity as T;
  }

  async update<T = Record<string, unknown>>(
    tableName: string,
    where: QueryFilter,
    patch: Record<string, unknown>,
  ): Promise<T[]> {
    const table = this.registry.getOrThrow(tableName);
    const ctx = { table: tableName };

    const resolvedPatch = await this.hooks.runBeforeUpdate(
      tableName,
      patch,
      ctx,
    );

    const current = await this.adapter.findOne<Record<string, unknown>>(
      tableName,
      { where },
    );
    const merged = { ...(current ?? {}), ...resolvedPatch };

    const touchedFields = Object.keys(resolvedPatch);
    const failures = await this.validateEntity(table, merged, touchedFields);
    if (failures.length > 0) throw new ValidationError(tableName, failures);

    const rows = await this.adapter.update<Record<string, unknown>>(
      tableName,
      where,
      resolvedPatch,
    );
    for (const row of rows) {
      await this.hooks.runAfterUpdate(tableName, row, ctx);
    }

    return rows as T[];
  }

  async delete(tableName: string, where: QueryFilter): Promise<number> {
    this.registry.getOrThrow(tableName);
    const ctx = { table: tableName };

    await this.hooks.runBeforeDelete(tableName, where, ctx);
    const count = await this.adapter.delete(tableName, where);
    await this.hooks.runAfterDelete(tableName, ctx);

    return count;
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
      for (const validator of column.validators) {
        const result = await validator.validate(value, entity);
        if (!result.valid)
          failures.push({ field: column.name, message: result.message });
      }
    }

    for (const tableValidator of table.tableValidators) {
      if (
        onlyFields &&
        !tableValidator.fields.some((f) => onlyFields.includes(f))
      )
        continue;
      const result = await tableValidator.validate(entity);
      if (!result.valid) {
        failures.push({
          field: tableValidator.fields.join(","),
          message: result.message,
        });
      }
    }

    return failures;
  }
}

export function createQueryEngine(
  registry: MetadataRegistry,
  adapter: DatabaseAdapter,
  hooks?: HooksRegistry,
): QueryEngine {
  return new QueryEngine(registry, adapter, hooks);
}
