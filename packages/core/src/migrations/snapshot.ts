import type { MetadataRegistry } from "../metadata/registry.js";
import type { RelationMetadata, TableMetadata } from "../metadata/types.js";
import { normalizeMigrationValue } from "./serialization.js";
import type {
  SchemaColumnSnapshot,
  SchemaForeignKeySnapshot,
  SchemaSnapshot,
  SchemaTableSnapshot,
} from "./types.js";

export const EMPTY_SCHEMA_SNAPSHOT: SchemaSnapshot = {
  version: 1,
  tables: [],
};

export function createSchemaSnapshot(
  registry: MetadataRegistry,
): SchemaSnapshot {
  const tables = registry.getAll();
  const byName = new Map(tables.map((table) => [table.name, table]));
  return {
    version: 1,
    tables: tables
      .map((table) => createTableSnapshot(table, byName))
      .sort((left, right) => left.collectionName.localeCompare(right.collectionName)),
  };
}

function createTableSnapshot(
  table: TableMetadata,
  tables: ReadonlyMap<string, TableMetadata>,
): SchemaTableSnapshot {
  return {
    name: table.name,
    collectionName: table.collectionName,
    columns: table.columns
      .map<SchemaColumnSnapshot>((column) => ({
        name: column.name,
        columnName: column.columnName,
        type: column.type,
        nullable: column.nullable,
        primaryKey: column.primaryKey,
        unique: column.unique,
        ...(column.default === undefined
          ? {}
          : typeof column.default === "function"
            ? { default: { kind: "runtime" as const } }
            : {
                default: {
                  kind: "static" as const,
                  value: normalizeMigrationValue(column.default),
                },
              }),
      }))
      .sort((left, right) => left.columnName.localeCompare(right.columnName)),
    indexes: (table.indexes ?? [])
      .map((index) => ({
        ...index,
        fields: index.fields.map((field) => {
          const column = table.columns.find((item) => item.name === field);
          if (!column) {
            throw new Error(
              `Index "${index.name}" references unknown field "${field}".`,
            );
          }
          return column.columnName;
        }),
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    foreignKeys: table.relations
      .map((relation) => createForeignKeySnapshot(table, relation, tables))
      .filter((item): item is SchemaForeignKeySnapshot => item !== undefined)
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

function createForeignKeySnapshot(
  source: TableMetadata,
  relation: RelationMetadata,
  tables: ReadonlyMap<string, TableMetadata>,
): SchemaForeignKeySnapshot | undefined {
  if (relation.kind !== "manyToOne" && relation.kind !== "oneToOne") {
    return undefined;
  }
  const target = tables.get(relation.target);
  if (!target) return undefined;
  const sourceColumn = source.columns.find(
    (column) => column.name === relation.foreignKey,
  );
  const targetField = relation.references ?? "id";
  const targetColumn = target.columns.find((column) => column.name === targetField);
  if (!sourceColumn || !targetColumn) return undefined;
  return {
    name: foreignKeyName(source.collectionName, relation.name),
    field: sourceColumn.columnName,
    targetTable: target.collectionName,
    targetField: targetColumn.columnName,
  };
}

function foreignKeyName(table: string, relation: string): string {
  const name = `persistence_${table}_${relation}_fk`;
  if (name.length <= 63) return name;
  let hash = 2166136261;
  for (const character of name) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${name.slice(0, 54)}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
