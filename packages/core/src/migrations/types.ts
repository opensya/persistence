import type { ColumnType } from "../metadata/types.js";

export type MigrationValue =
  | null
  | boolean
  | number
  | string
  | MigrationValue[]
  | { [key: string]: MigrationValue };

export interface SchemaColumnSnapshot {
  name: string;
  columnName: string;
  type: ColumnType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  default?:
    | { kind: "static"; value: MigrationValue }
    | { kind: "runtime" };
}

export interface SchemaIndexSnapshot {
  name: string;
  fields: string[];
  unique: boolean;
}

export interface SchemaForeignKeySnapshot {
  name: string;
  field: string;
  targetTable: string;
  targetField: string;
}

export interface SchemaTableSnapshot {
  name: string;
  collectionName: string;
  columns: SchemaColumnSnapshot[];
  indexes: SchemaIndexSnapshot[];
  foreignKeys: SchemaForeignKeySnapshot[];
}

export interface SchemaSnapshot {
  version: 1;
  tables: SchemaTableSnapshot[];
}

export type MigrationSafety = "safe" | "destructive" | "irreversible";

interface BaseMigrationOperation {
  safety: MigrationSafety;
}

export type MigrationOperation =
  | (BaseMigrationOperation & {
      kind: "createTable";
      table: SchemaTableSnapshot;
    })
  | (BaseMigrationOperation & {
      kind: "dropTable";
      table: SchemaTableSnapshot;
    })
  | (BaseMigrationOperation & {
      kind: "addColumn";
      table: string;
      column: SchemaColumnSnapshot;
    })
  | (BaseMigrationOperation & {
      kind: "alterColumn";
      table: string;
      before: SchemaColumnSnapshot;
      after: SchemaColumnSnapshot;
    })
  | (BaseMigrationOperation & {
      kind: "dropColumn";
      table: string;
      column: SchemaColumnSnapshot;
    })
  | (BaseMigrationOperation & {
      kind: "createIndex";
      table: string;
      index: SchemaIndexSnapshot;
    })
  | (BaseMigrationOperation & {
      kind: "dropIndex";
      table: string;
      index: SchemaIndexSnapshot;
    })
  | (BaseMigrationOperation & {
      kind: "addForeignKey";
      table: string;
      foreignKey: SchemaForeignKeySnapshot;
    })
  | (BaseMigrationOperation & {
      kind: "dropForeignKey";
      table: string;
      foreignKey: SchemaForeignKeySnapshot;
    });

export interface MigrationArtifact {
  version: 1;
  id: string;
  name: string;
  createdAt: string;
  checksum: string;
  previous: SchemaSnapshot;
  next: SchemaSnapshot;
  operations: MigrationOperation[];
}

export interface GenerateMigrationOptions {
  name: string;
  previous?: SchemaSnapshot;
  createdAt?: string;
}

export interface MigrationStatementPlan {
  migrationId: string;
  statements: string[];
}

export interface MigrationPlan {
  migrations: MigrationStatementPlan[];
  destructive: boolean;
  irreversible: boolean;
}

export interface ApplyMigrationsOptions {
  dryRun?: boolean;
  allowDestructive?: boolean;
}

export interface MigrationApplyResult {
  applied: string[];
  skipped: string[];
  plan: MigrationPlan;
  dryRun: boolean;
}

export interface MigrationStatusEntry {
  id: string;
  name: string;
  checksum: string;
  status: "pending" | "applied" | "failed";
  appliedAt?: string;
  error?: string;
}
