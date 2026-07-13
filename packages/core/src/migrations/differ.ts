import { stableStringify } from "./serialization.js";
import type {
  MigrationOperation,
  MigrationSafety,
  SchemaColumnSnapshot,
  SchemaSnapshot,
  SchemaTableSnapshot,
} from "./types.js";

export function diffSchemaSnapshots(
  previous: SchemaSnapshot,
  next: SchemaSnapshot,
): MigrationOperation[] {
  const operations: MigrationOperation[] = [];
  const previousTables = new Map(
    previous.tables.map((table) => [table.collectionName, table]),
  );
  const nextTables = new Map(
    next.tables.map((table) => [table.collectionName, table]),
  );

  for (const table of previous.tables) {
    if (!nextTables.has(table.collectionName)) {
      operations.push({ kind: "dropTable", table, safety: "irreversible" });
    }
  }

  for (const table of next.tables) {
    const before = previousTables.get(table.collectionName);
    if (!before) {
      operations.push({ kind: "createTable", table, safety: "safe" });
      for (const index of table.indexes) {
        operations.push({
          kind: "createIndex",
          table: table.collectionName,
          index,
          safety: "safe",
        });
      }
      for (const foreignKey of table.foreignKeys) {
        operations.push({
          kind: "addForeignKey",
          table: table.collectionName,
          foreignKey,
          safety: "safe",
        });
      }
      continue;
    }
    diffTable(before, table, operations);
  }

  return orderOperations(operations);
}

function diffTable(
  previous: SchemaTableSnapshot,
  next: SchemaTableSnapshot,
  operations: MigrationOperation[],
): void {
  const previousColumns = new Map(
    previous.columns.map((column) => [column.columnName, column]),
  );
  const nextColumns = new Map(
    next.columns.map((column) => [column.columnName, column]),
  );

  for (const foreignKey of previous.foreignKeys) {
    const current = next.foreignKeys.find((item) => item.name === foreignKey.name);
    if (!current || stableStringify(current) !== stableStringify(foreignKey)) {
      operations.push({
        kind: "dropForeignKey",
        table: next.collectionName,
        foreignKey,
        safety: "destructive",
      });
    }
  }
  for (const index of previous.indexes) {
    const current = next.indexes.find((item) => item.name === index.name);
    if (!current || stableStringify(current) !== stableStringify(index)) {
      operations.push({
        kind: "dropIndex",
        table: next.collectionName,
        index,
        safety: "destructive",
      });
    }
  }
  for (const column of previous.columns) {
    if (!nextColumns.has(column.columnName)) {
      operations.push({
        kind: "dropColumn",
        table: next.collectionName,
        column,
        safety: "irreversible",
      });
    }
  }
  for (const column of next.columns) {
    const before = previousColumns.get(column.columnName);
    if (!before) {
      operations.push({
        kind: "addColumn",
        table: next.collectionName,
        column,
        safety: addColumnSafety(column),
      });
    } else if (stableStringify(before) !== stableStringify(column)) {
      operations.push({
        kind: "alterColumn",
        table: next.collectionName,
        before,
        after: column,
        safety: alterColumnSafety(before, column),
      });
    }
  }
  for (const index of next.indexes) {
    const before = previous.indexes.find((item) => item.name === index.name);
    if (!before || stableStringify(before) !== stableStringify(index)) {
      operations.push({
        kind: "createIndex",
        table: next.collectionName,
        index,
        safety: "safe",
      });
    }
  }
  for (const foreignKey of next.foreignKeys) {
    const before = previous.foreignKeys.find(
      (item) => item.name === foreignKey.name,
    );
    if (!before || stableStringify(before) !== stableStringify(foreignKey)) {
      operations.push({
        kind: "addForeignKey",
        table: next.collectionName,
        foreignKey,
        safety: "safe",
      });
    }
  }
}

function addColumnSafety(column: SchemaColumnSnapshot): MigrationSafety {
  return column.nullable || column.default?.kind === "static"
    ? "safe"
    : "destructive";
}

function alterColumnSafety(
  before: SchemaColumnSnapshot,
  after: SchemaColumnSnapshot,
): MigrationSafety {
  if (before.type !== after.type) return "irreversible";
  if (before.nullable && !after.nullable) return "destructive";
  if (!before.primaryKey && after.primaryKey) return "destructive";
  if (!before.unique && after.unique) return "destructive";
  return "safe";
}

function orderOperations(
  operations: MigrationOperation[],
): MigrationOperation[] {
  const order: Record<MigrationOperation["kind"], number> = {
    dropForeignKey: 0,
    dropIndex: 1,
    dropColumn: 2,
    dropTable: 3,
    createTable: 4,
    addColumn: 5,
    alterColumn: 6,
    createIndex: 7,
    addForeignKey: 8,
  };
  return operations
    .map((operation, index) => ({ operation, index }))
    .sort(
      (left, right) =>
        order[left.operation.kind] - order[right.operation.kind] ||
        left.index - right.index,
    )
    .map(({ operation }) => operation);
}
