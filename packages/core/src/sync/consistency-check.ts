import type { MetadataRegistry } from "../metadata/registry.js";
import type {
  TableMetadata,
  ColumnMetadata,
  IndexMetadata,
} from "../metadata/types.js";
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
          `Table "${declared.collectionName}" is declared but missing in the database — pending migration?`,
        );
        drifts.push({ table: declared.name, issues });
        continue;
      }

      this.compareColumns(declared, actual, issues);
      this.compareIndexes(declared, actual, issues);

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
          `Column "${column.columnName}" is declared but missing in the database.`,
        );
        continue;
      }

      this.compareColumn(column, actualColumn, issues);
      actualColumns.delete(column.columnName);
    }

    for (const orphan of actualColumns.values()) {
      issues.push(
        `Column "${orphan.columnName}" exists in the database but is not declared in the schema.`,
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
        `Column "${declared.columnName}": declared type "${declared.type}" ≠ actual type "${actual.type}".`,
      );
    }
    if (declared.nullable !== actual.nullable) {
      issues.push(
        `Column "${declared.columnName}": declared nullable "${declared.nullable}" ≠ actual "${actual.nullable}".`,
      );
    }
    if (declared.primaryKey !== actual.primaryKey) {
      issues.push(
        `Column "${declared.columnName}": declared primaryKey "${declared.primaryKey}" ≠ actual "${actual.primaryKey}".`,
      );
    }
    if (declared.unique !== actual.unique) {
      issues.push(
        `Column "${declared.columnName}": declared unique "${declared.unique}" ≠ actual "${actual.unique}".`,
      );
    }
  }

  private compareIndexes(
    declared: TableMetadata,
    actual: TableMetadata,
    issues: string[],
  ): void {
    const actualByName = new Map(
      (actual.indexes ?? []).map((index) => [index.name, index]),
    );

    for (const index of declared.indexes ?? []) {
      const actualIndex = actualByName.get(index.name);

      if (!actualIndex) {
        issues.push(
          `Index "${index.name}" is declared but missing in the database.`,
        );
        continue;
      }

      this.compareIndex(index, actualIndex, issues);
      actualByName.delete(index.name);
    }

    for (const orphan of actualByName.values()) {
      issues.push(
        `Index "${orphan.name}" exists in the database but is not declared in the schema.`,
      );
    }
  }

  private compareIndex(
    declared: IndexMetadata,
    actual: IndexMetadata,
    issues: string[],
  ): void {
    if (declared.unique !== actual.unique) {
      issues.push(
        `Index "${declared.name}": declared unique "${declared.unique}" ≠ actual "${actual.unique}".`,
      );
    }

    const sameFields =
      declared.fields.length === actual.fields.length &&
      declared.fields.every((field, i) => field === actual.fields[i]);

    if (!sameFields) {
      issues.push(
        `Index "${declared.name}": declared fields [${declared.fields.join(", ")}] ≠ actual fields [${actual.fields.join(", ")}].`,
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
