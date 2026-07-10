import type { DatabaseAdapter, QueryFilter } from "../adapter/types.js";
import type { MetadataRegistry } from "../metadata/registry.js";
import type {
  ManyToManyRelationMetadata,
  RelationMetadata,
} from "../metadata/types.js";

type Entity = Record<string, unknown>;

export class RelationResolver {
  constructor(
    private readonly registry: MetadataRegistry,
    private readonly adapter: DatabaseAdapter,
  ) {}

  async populate<T extends Entity>(
    tableName: string,
    entities: T[],
    relationNames: string[],
  ): Promise<T[]> {
    if (!entities.length) return entities;

    const table = this.registry.getOrThrow(tableName);
    let result: Entity[] = entities;

    for (const relationName of relationNames) {
      const relation = table.relations.find((item) => item.name === relationName);
      if (!relation) {
        throw new Error(`Unknown relation "${relationName}" on table "${tableName}".`);
      }
      result = await this.populateOne(result, relation);
    }

    return result as T[];
  }

  private populateOne(
    entities: Entity[],
    relation: RelationMetadata,
  ): Promise<Entity[]> {
    switch (relation.kind) {
      case "manyToOne":
      case "oneToOne":
        return this.populateSingular(entities, relation);
      case "oneToMany":
        return this.populateOneToMany(entities, relation);
      case "manyToMany":
        return this.populateManyToMany(entities, relation);
    }
  }

  private async populateSingular(
    entities: Entity[],
    relation: Extract<RelationMetadata, { kind: "manyToOne" | "oneToOne" }>,
  ): Promise<Entity[]> {
    const targetKey = relation.references ?? "id";
    const values = this.collectValues(entities, relation.foreignKey);
    const related = values.length
      ? await this.adapter.findMany<Entity>(relation.target, {
          where: this.inFilter(targetKey, values),
        })
      : [];

    const byKey = new Map(related.map((row) => [row[targetKey], row]));
    return entities.map((entity) => ({
      ...entity,
      [relation.name]: byKey.get(entity[relation.foreignKey]) ?? null,
    }));
  }

  private async populateOneToMany(
    entities: Entity[],
    relation: Extract<RelationMetadata, { kind: "oneToMany" }>,
  ): Promise<Entity[]> {
    const sourceKey = relation.references ?? "id";
    const values = this.collectValues(entities, sourceKey);
    const related = values.length
      ? await this.adapter.findMany<Entity>(relation.target, {
          where: this.inFilter(relation.foreignKey, values),
        })
      : [];

    const grouped = this.groupBy(related, relation.foreignKey);
    return entities.map((entity) => ({
      ...entity,
      [relation.name]: grouped.get(entity[sourceKey]) ?? [],
    }));
  }

  private async populateManyToMany(
    entities: Entity[],
    relation: ManyToManyRelationMetadata,
  ): Promise<Entity[]> {
    const sourceKey = relation.sourceKey ?? "id";
    const targetKey = relation.targetKey ?? "id";
    const sourceValues = this.collectValues(entities, sourceKey);

    if (!sourceValues.length) {
      return entities.map((entity) => ({ ...entity, [relation.name]: [] }));
    }

    const junctionRows = await this.adapter.findMany<Entity>(
      relation.through.table,
      {
        where: this.inFilter(
          relation.through.sourceForeignKey,
          sourceValues,
        ),
      },
    );

    const targetValues = this.collectValues(
      junctionRows,
      relation.through.targetForeignKey,
    );
    const targets = targetValues.length
      ? await this.adapter.findMany<Entity>(relation.target, {
          where: this.inFilter(targetKey, targetValues),
        })
      : [];

    const targetsByKey = new Map(targets.map((row) => [row[targetKey], row]));
    const junctionsBySource = this.groupBy(
      junctionRows,
      relation.through.sourceForeignKey,
    );

    return entities.map((entity) => {
      const junctions = junctionsBySource.get(entity[sourceKey]) ?? [];
      const related = junctions
        .map((row) => targetsByKey.get(row[relation.through.targetForeignKey]))
        .filter((row): row is Entity => Boolean(row));
      return { ...entity, [relation.name]: related };
    });
  }

  private inFilter(field: string, values: unknown[]): QueryFilter {
    return { conditions: [{ field, operator: "in", value: values }] };
  }

  private collectValues(entities: Entity[], field: string): unknown[] {
    return [
      ...new Set(
        entities
          .map((entity) => entity[field])
          .filter((value) => value !== null && value !== undefined),
      ),
    ];
  }

  private groupBy(entities: Entity[], field: string): Map<unknown, Entity[]> {
    const grouped = new Map<unknown, Entity[]>();
    for (const entity of entities) {
      const key = entity[field];
      grouped.set(key, [...(grouped.get(key) ?? []), entity]);
    }
    return grouped;
  }
}

export function createRelationResolver(
  registry: MetadataRegistry,
  adapter: DatabaseAdapter,
): RelationResolver {
  return new RelationResolver(registry, adapter);
}
