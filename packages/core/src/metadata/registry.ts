import type { RelationMetadata, TableMetadata } from "./types.js";
import type {
  TableMetadataMap,
  TablesToMetadataMap,
} from "./inference.js";

export interface RegistryValidationError {
  table: string;
  message: string;
}

export class MetadataRegistry<
  TTables extends TableMetadataMap = Record<never, never>,
> {
  private readonly tables = new Map<string, TableMetadata>();
  private locked = false;

  register<const TTable extends TableMetadata>(
    table: TTable,
  ): MetadataRegistry<TTables & Record<TTable["name"], TTable>> {
    if (this.locked) {
      throw new Error(`Cannot register "${table.name}": registry is locked.`);
    }
    if (this.tables.has(table.name)) {
      throw new Error(`Table "${table.name}" is already registered.`);
    }
    this.tables.set(table.name, table);
    return this as unknown as MetadataRegistry<
      TTables & Record<TTable["name"], TTable>
    >;
  }

  get(name: string): TableMetadata | undefined {
    return this.tables.get(name);
  }

  getOrThrow(name: string): TableMetadata {
    const table = this.tables.get(name);
    if (!table) {
      const known = [...this.tables.keys()].join(", ") || "(none)";
      throw new Error(`Unknown table "${name}". Known tables: ${known}.`);
    }
    return table;
  }

  has(name: string): boolean {
    return this.tables.has(name);
  }

  getAll(): readonly TableMetadata[] {
    return [...this.tables.values()];
  }

  validate(): RegistryValidationError[] {
    const errors: RegistryValidationError[] = [];
    const collectionNames = new Set<string>();

    for (const table of this.tables.values()) {
      if (collectionNames.has(table.collectionName)) {
        errors.push({
          table: table.name,
          message: `Collection name "${table.collectionName}" is used more than once.`,
        });
      }
      collectionNames.add(table.collectionName);
      this.validateColumns(table, errors);
      this.validateAudit(table, errors);
      this.validateRelations(table, errors);
    }

    return errors;
  }

  lock(): void {
    const errors = this.validate();
    if (errors.length) {
      const details = errors
        .map((error) => `  - [${error.table}] ${error.message}`)
        .join("\n");
      throw new Error(`Schema validation failed:\n${details}`);
    }
    this.locked = true;
  }

  isLocked(): boolean {
    return this.locked;
  }

  private validateColumns(
    table: TableMetadata,
    errors: RegistryValidationError[],
  ): void {
    const names = new Set<string>();
    const columnNames = new Set<string>();

    for (const column of table.columns) {
      if (names.has(column.name)) {
        errors.push({ table: table.name, message: `Duplicate field "${column.name}".` });
      }
      if (columnNames.has(column.columnName)) {
        errors.push({
          table: table.name,
          message: `Duplicate database column "${column.columnName}".`,
        });
      }
      names.add(column.name);
      columnNames.add(column.columnName);
    }

    if (!table.columns.some((column) => column.primaryKey)) {
      errors.push({ table: table.name, message: "At least one primary key is required." });
    }
  }

  private validateRelations(
    table: TableMetadata,
    errors: RegistryValidationError[],
  ): void {
    const relationNames = new Set<string>();

    for (const relation of table.relations) {
      if (relationNames.has(relation.name)) {
        errors.push({ table: table.name, message: `Duplicate relation "${relation.name}".` });
      }
      relationNames.add(relation.name);

      const target = this.tables.get(relation.target);
      if (!target) {
        errors.push({
          table: table.name,
          message: `Relation "${relation.name}" targets unknown table "${relation.target}".`,
        });
        continue;
      }

      this.validateRelationFields(table, target, relation, errors);
    }
  }

  private validateAudit(
    table: TableMetadata,
    errors: RegistryValidationError[],
  ): void {
    const knownFields = new Set(table.columns.map((column) => column.name));
    const excludedFields = table.audit?.excludedFields ?? [];

    for (const field of new Set(excludedFields)) {
      if (!knownFields.has(field)) {
        errors.push({
          table: table.name,
          message: `Audit configuration excludes unknown field "${field}".`,
        });
      }
    }
  }

  private validateRelationFields(
    source: TableMetadata,
    target: TableMetadata,
    relation: RelationMetadata,
    errors: RegistryValidationError[],
  ): void {
    const hasField = (table: TableMetadata, field: string) =>
      table.columns.some((column) => column.name === field);

    if (relation.kind === "manyToOne" || relation.kind === "oneToOne") {
      if (!hasField(source, relation.foreignKey)) {
        errors.push({
          table: source.name,
          message: `Relation "${relation.name}" references missing source field "${relation.foreignKey}".`,
        });
      }
      const targetKey = relation.references ?? "id";
      if (!hasField(target, targetKey)) {
        errors.push({
          table: source.name,
          message: `Relation "${relation.name}" references missing target field "${targetKey}".`,
        });
      }
      return;
    }

    if (relation.kind === "oneToMany") {
      const sourceKey = relation.references ?? "id";
      if (!hasField(source, sourceKey)) {
        errors.push({
          table: source.name,
          message: `Relation "${relation.name}" references missing source field "${sourceKey}".`,
        });
      }
      if (!hasField(target, relation.foreignKey)) {
        errors.push({
          table: source.name,
          message: `Relation "${relation.name}" references missing target field "${relation.foreignKey}".`,
        });
      }
      return;
    }

    const through = this.tables.get(relation.through.table);
    if (!through) {
      errors.push({
        table: source.name,
        message: `Relation "${relation.name}" uses unknown junction table "${relation.through.table}".`,
      });
      return;
    }

    for (const field of [
      relation.through.sourceForeignKey,
      relation.through.targetForeignKey,
    ]) {
      if (!hasField(through, field)) {
        errors.push({
          table: source.name,
          message: `Relation "${relation.name}" references missing junction field "${field}".`,
        });
      }
    }
  }
}

export function createMetadataRegistry<
  const TTables extends readonly TableMetadata[] = [],
>(...tables: TTables): MetadataRegistry<TablesToMetadataMap<TTables>> {
  const registry = new MetadataRegistry<TablesToMetadataMap<TTables>>();
  for (const table of tables) registry.register(table);
  return registry;
}
