import type { MetadataRegistry } from "../metadata/registry.js";
import type { TableMetadata, ColumnMetadata } from "../metadata/types.js";
import type { DatabaseAdapter } from "../adapter/types.js";
import type { SchemaDrift } from "./types.js";

export class ConsistencyChecker {
  constructor(
    private readonly registry: MetadataRegistry,
    private readonly adapter: DatabaseAdapter,
  ) {}

  async check(): Promise<SchemaDrift[]> {
    const actualTables = await this.adapter.introspect();
    const actualByName = new Map(
      actualTables.map((t) => [t.collectionName, t]),
    );

    const drifts: SchemaDrift[] = [];

    for (const declared of this.registry.getAll()) {
      const issues: string[] = [];
      const actual = actualByName.get(declared.collectionName);

      if (!actual) {
        issues.push(
          `Table "${declared.collectionName}" déclarée mais absente en base — migration manquante ?`,
        );
        drifts.push({ table: declared.name, issues });
        continue;
      }

      this.compareColumns(declared, actual, issues);

      if (issues.length > 0) {
        drifts.push({ table: declared.name, issues });
      }
    }

    return drifts;
  }

  private compareColumns(
    declared: TableMetadata,
    actual: TableMetadata,
    issues: string[],
  ): void {
    const actualColumns = new Map(actual.columns.map((c) => [c.columnName, c]));

    for (const column of declared.columns) {
      const actualColumn = actualColumns.get(column.columnName);

      if (!actualColumn) {
        issues.push(
          `Colonne "${column.columnName}" déclarée mais absente en base.`,
        );
        continue;
      }

      this.compareColumn(column, actualColumn, issues);
      actualColumns.delete(column.columnName);
    }

    for (const orphan of actualColumns.values()) {
      issues.push(
        `Colonne "${orphan.columnName}" présente en base mais non déclarée dans le schema.`,
      );
    }
  }

  private compareColumn(
    declared: ColumnMetadata,
    actual: ColumnMetadata,
    issues: string[],
  ): void {
    if (declared.type !== actual.type) {
      issues.push(
        `Colonne "${declared.columnName}" : type déclaré "${declared.type}" ≠ type réel "${actual.type}".`,
      );
    }
    if (declared.nullable !== actual.nullable) {
      issues.push(
        `Colonne "${declared.columnName}" : nullable déclaré "${declared.nullable}" ≠ réel "${actual.nullable}".`,
      );
    }
    if (declared.primaryKey !== actual.primaryKey) {
      issues.push(
        `Colonne "${declared.columnName}" : primaryKey déclaré "${declared.primaryKey}" ≠ réel "${actual.primaryKey}".`,
      );
    }
  }
}

export function createConsistencyChecker(
  registry: MetadataRegistry,
  adapter: DatabaseAdapter,
): ConsistencyChecker {
  return new ConsistencyChecker(registry, adapter);
}
