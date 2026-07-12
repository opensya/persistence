import type { MetadataRegistry } from "../metadata/registry.js";
import type { ColumnMetadata, TableMetadata } from "../metadata/types.js";

export interface SerializationContextInput {
  user?: unknown;
  requestId?: string;
  tenantId?: string;
}

/**
 * Applies each column's `hidden`/`visibility` rule to query results.
 *
 * This runs *after* the database round-trip and *after* relation
 * population — it never affects what gets written, queried, or passed to
 * lifecycle hooks. Hooks and validators still see the full, unserialized
 * entity; only the value returned to the caller is filtered.
 */
export class FieldSerializer {
  constructor(private readonly registry: MetadataRegistry) {}

  async serializeMany<T extends Record<string, unknown>>(
    tableName: string,
    entities: T[],
    context: SerializationContextInput = {},
  ): Promise<T[]> {
    if (!entities.length) return entities;
    const table = this.registry.getOrThrow(tableName);
    return Promise.all(
      entities.map((entity) => this.serializeEntity(table, entity, context)),
    ) as Promise<T[]>;
  }

  async serializeOne<T extends Record<string, unknown>>(
    tableName: string,
    entity: T,
    context: SerializationContextInput = {},
  ): Promise<T> {
    const table = this.registry.getOrThrow(tableName);
    return this.serializeEntity(table, entity, context) as Promise<T>;
  }

  private async serializeEntity(
    table: TableMetadata,
    entity: Record<string, unknown>,
    context: SerializationContextInput,
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const column of table.columns) {
      if (await this.isColumnVisible(column, entity, context)) {
        result[column.name] = entity[column.name];
      }
    }

    // Populated relations (added by RelationResolver.populate()) aren't
    // declared as columns, so the loop above never touches them — walk
    // them separately and recurse into the target table's own visibility
    // rules.
    for (const relation of table.relations) {
      if (!(relation.name in entity)) continue;
      result[relation.name] = await this.serializeRelationValue(
        relation.target,
        entity[relation.name],
        context,
      );
    }

    return result;
  }

  private serializeRelationValue(
    targetTable: string,
    value: unknown,
    context: SerializationContextInput,
  ): Promise<unknown> | unknown {
    if (value === null || value === undefined) return value;
    if (!this.registry.has(targetTable)) return value;

    if (Array.isArray(value)) {
      return this.serializeMany(
        targetTable,
        value as Record<string, unknown>[],
        context,
      );
    }

    return this.serializeOne(
      targetTable,
      value as Record<string, unknown>,
      context,
    );
  }

  private isColumnVisible(
    column: ColumnMetadata,
    entity: Readonly<Record<string, unknown>>,
    context: SerializationContextInput,
  ): boolean | Promise<boolean> {
    if (column.hidden) return false;
    if (!column.visibility) return true;

    return column.visibility({
      user: context.user,
      entity,
      ...(context.requestId !== undefined && { requestId: context.requestId }),
      ...(context.tenantId !== undefined && { tenantId: context.tenantId }),
    });
  }
}

export function createFieldSerializer(
  registry: MetadataRegistry,
): FieldSerializer {
  return new FieldSerializer(registry);
}
