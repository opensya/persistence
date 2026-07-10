import type { MetadataRegistry } from "../metadata/registry.js";
import type { RelationMetadata } from "../metadata/types.js";
import type { DatabaseAdapter } from "../adapter/types.js";

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
    if (entities.length === 0) return entities;

    const table = this.registry.getOrThrow(tableName);
    let result: Entity[] = entities;

    for (const relationName of relationNames) {
      const relation = table.relations.find((r) => r.name === relationName);
      if (!relation) {
        throw new Error(
          `Relation "${relationName}" introuvable sur la table "${tableName}".`,
        );
      }
      result = await this.populateOne(result, relation);
    }

    return result as T[];
  }

  private async populateOne(
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
    relation: RelationMetadata,
  ): Promise<Entity[]> {
    const fkField = this.requireField(relation, "foreignKey");
    const targetKey = relation.references ?? "id";

    const fkValues = this.collectValues(entities, fkField);
    const related = fkValues.length
      ? await this.adapter.findMany<Entity>(relation.target, {
          where: { [targetKey]: fkValues },
        })
      : [];

    const byKey = new Map(related.map((row) => [row[targetKey], row]));

    return entities.map((entity) => ({
      ...entity,
      [relation.name]: byKey.get(entity[fkField]) ?? null,
    }));
  }

  private async populateOneToMany(
    entities: Entity[],
    relation: RelationMetadata,
  ): Promise<Entity[]> {
    const fkFieldOnTarget = this.requireField(relation, "foreignKey");
    const localKey = relation.references ?? "id";

    const localValues = this.collectValues(entities, localKey);
    const related = localValues.length
      ? await this.adapter.findMany<Entity>(relation.target, {
          where: { [fkFieldOnTarget]: localValues },
        })
      : [];

    const grouped = new Map<unknown, Entity[]>();
    for (const row of related) {
      const key = row[fkFieldOnTarget];
      const list = grouped.get(key) ?? [];
      list.push(row);
      grouped.set(key, list);
    }

    return entities.map((entity) => ({
      ...entity,
      [relation.name]: grouped.get(entity[localKey]) ?? [],
    }));
  }

  private async populateManyToMany(
    _entities: Entity[],
    relation: RelationMetadata,
  ): Promise<Entity[]> {
    throw new Error(
      `Relation "${relation.name}" (manyToMany) non supportée : il manque une déclaration explicite ` +
        `des colonnes de jointure sur la table through "${relation.through}".`,
    );
  }

  private requireField(
    relation: RelationMetadata,
    field: "foreignKey",
  ): string {
    const value = relation[field];
    if (!value) {
      throw new Error(
        `Relation "${relation.name}" (${relation.kind}) : "${field}" manquant.`,
      );
    }
    return value;
  }

  private collectValues(entities: Entity[], field: string): unknown[] {
    const values = entities
      .map((e) => e[field])
      .filter((v) => v !== null && v !== undefined);
    return Array.from(new Set(values));
  }
}

export function createRelationResolver(
  registry: MetadataRegistry,
  adapter: DatabaseAdapter,
): RelationResolver {
  return new RelationResolver(registry, adapter);
}
