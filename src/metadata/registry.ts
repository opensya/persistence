import type { TableMetadata } from "./types.js";

export interface RegistryValidationError {
  table: string;
  message: string;
}

export class MetadataRegistry {
  private readonly tables = new Map<string, TableMetadata>();
  private locked = false;

  register(table: TableMetadata): void {
    if (this.locked) {
      throw new Error(
        `Impossible d'enregistrer "${table.name}" : le registry est verrouillé (lock() a déjà été appelé).`,
      );
    }
    if (this.tables.has(table.name)) {
      throw new Error(
        `La table "${table.name}" est déjà enregistrée dans le registry.`,
      );
    }
    this.tables.set(table.name, table);
  }

  get(name: string): TableMetadata | undefined {
    return this.tables.get(name);
  }

  getOrThrow(name: string): TableMetadata {
    const table = this.tables.get(name);
    if (!table) {
      const known = Array.from(this.tables.keys()).join(", ") || "(aucune)";
      throw new Error(
        `Table "${name}" introuvable dans le registry. Tables connues : ${known}.`,
      );
    }
    return table;
  }

  has(name: string): boolean {
    return this.tables.has(name);
  }

  getAll(): readonly TableMetadata[] {
    return Array.from(this.tables.values());
  }

  validate(): RegistryValidationError[] {
    const errors: RegistryValidationError[] = [];

    for (const table of this.tables.values()) {
      this.validateColumns(table, errors);
      this.validateRelations(table, errors);
    }

    return errors;
  }

  private validateColumns(
    table: TableMetadata,
    errors: RegistryValidationError[],
  ): void {
    const seenColumnNames = new Set<string>();

    for (const column of table.columns) {
      if (seenColumnNames.has(column.name)) {
        errors.push({
          table: table.name,
          message: `Colonne "${column.name}" déclarée plusieurs fois.`,
        });
      }
      seenColumnNames.add(column.name);
    }

    const hasPrimaryKey = table.columns.some((column) => column.primaryKey);
    if (!hasPrimaryKey) {
      errors.push({
        table: table.name,
        message: "Aucune colonne primaryKey définie.",
      });
    }
  }

  private validateRelations(
    table: TableMetadata,
    errors: RegistryValidationError[],
  ): void {
    for (const relation of table.relations) {
      if (!this.tables.has(relation.target)) {
        errors.push({
          table: table.name,
          message: `Relation "${relation.name}" cible la table "${relation.target}" qui n'est pas enregistrée.`,
        });
        continue;
      }

      const needsForeignKey =
        relation.kind === "manyToOne" || relation.kind === "oneToMany";
      if (needsForeignKey && !relation.foreignKey) {
        errors.push({
          table: table.name,
          message: `Relation "${relation.name}" (${relation.kind}) nécessite un foreignKey.`,
        });
      }

      if (relation.kind === "manyToMany" && !relation.through) {
        errors.push({
          table: table.name,
          message: `Relation "${relation.name}" (manyToMany) nécessite une table through.`,
        });
      }
    }
  }

  lock(): void {
    const errors = this.validate();
    if (errors.length > 0) {
      const formatted = errors
        .map((e) => `  - [${e.table}] ${e.message}`)
        .join("\n");
      throw new Error(
        `Validation du schema échouée, registry non verrouillé :\n${formatted}`,
      );
    }
    this.locked = true;
  }

  isLocked(): boolean {
    return this.locked;
  }
}

export function createMetadataRegistry(): MetadataRegistry {
  return new MetadataRegistry();
}
