import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  not,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  json,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type PgAsyncDatabase,
  type PgColumnBuilder,
  type PgTableWithColumns,
} from "drizzle-orm/pg-core";
import type {
  ColumnMetadata,
  IndexMetadata,
  RelationMetadata,
  TableMetadata,
} from "../metadata/types.js";
import { stableStringify } from "../migrations/serialization.js";
import {
  DestructiveMigrationError,
  MigrationChecksumError,
} from "../migrations/errors.js";
import type {
  ApplyMigrationsOptions,
  MigrationApplyResult,
  MigrationArtifact,
  MigrationOperation,
  MigrationPlan,
  MigrationStatusEntry,
  MigrationValue,
  SchemaColumnSnapshot,
  SchemaForeignKeySnapshot,
  SchemaIndexSnapshot,
  SchemaTableSnapshot,
} from "../migrations/types.js";
import {
  hasFilterConstraints,
  type DatabaseAdapter,
  type FilterCondition,
  type QueryFilter,
  type QueryParams,
  type SchemaCreationOptions,
  type SchemaCreationResult,
} from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPgDatabase = PgAsyncDatabase<any, any, any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BuiltTable = PgTableWithColumns<any>;

type TransactionCapableDatabase = AnyPgDatabase & {
  transaction<T>(callback: (tx: AnyPgDatabase) => Promise<T>): Promise<T>;
};

class MigrationExecutionError extends Error {
  constructor(
    readonly migration: MigrationArtifact,
    cause: unknown,
  ) {
    super(`Migration "${migration.id}" failed.`, { cause });
    this.name = "MigrationExecutionError";
  }
}

export class PostgreAdapter implements DatabaseAdapter {
  constructor(
    private readonly db: AnyPgDatabase,
    private readonly tables = new Map<string, BuiltTable>(),
  ) {}

  buildTable(meta: TableMetadata): BuiltTable {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columns: Record<string, PgColumnBuilder<any>> = {};
    for (const column of meta.columns) {
      columns[column.name] = this.buildColumn(column);
    }

    const indexes = meta.indexes ?? [];
    const table = pgTable(meta.collectionName, columns, (t) =>
      indexes.map((declared) => {
        if (declared.fields.length === 0) {
          throw new Error(`Index "${declared.name}" has no fields.`);
        }
        const builder = declared.unique
          ? uniqueIndex(declared.name)
          : index(declared.name);
        // `.on()` is typed as a variadic tuple (at least one column); the
        // length check above guarantees that invariant at runtime, TS just
        // can't see it through `.map()` on a plain string[].
        const indexedColumns = declared.fields.map((field) => t[field]) as [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...any[],
        ];
        return builder.on(...indexedColumns);
      }),
    ) as BuiltTable;
    this.tables.set(meta.name, table);
    return table;
  }

  async findMany<T = Record<string, unknown>>(
    tableName: string,
    params: QueryParams = {},
  ): Promise<T[]> {
    const table = this.getTable(tableName);
    this.assertQueryFields(tableName, params);

    let query = this.db.select().from(table).$dynamic();
    const where = this.buildWhere(table, params.where);

    if (where) query = query.where(where);
    if (params.orderBy?.length) {
      query = query.orderBy(
        ...params.orderBy.map((item) =>
          item.direction === "asc"
            ? asc(table[item.field])
            : desc(table[item.field]),
        ),
      );
    }
    if (params.limit !== undefined) query = query.limit(params.limit);
    if (params.offset !== undefined) query = query.offset(params.offset);

    return query as unknown as Promise<T[]>;
  }

  async findOne<T = Record<string, unknown>>(
    tableName: string,
    params: QueryParams = {},
  ): Promise<T | null> {
    const rows = await this.findMany<T>(tableName, { ...params, limit: 1 });
    return rows[0] ?? null;
  }

  async insert<T = Record<string, unknown>>(
    tableName: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    const table = this.getTable(tableName);
    this.assertFields(tableName, Object.keys(data));
    const [row] = await this.db.insert(table).values(data).returning();
    return row as T;
  }

  async update<T = Record<string, unknown>>(
    tableName: string,
    where: QueryFilter,
    data: Record<string, unknown>,
  ): Promise<T[]> {
    this.assertSafeFilter("update", tableName, where);
    const table = this.getTable(tableName);
    this.assertFields(tableName, Object.keys(data));
    this.assertFilterFields(tableName, where);

    const condition = this.buildWhere(table, where);
    if (!condition) throw new Error("Expected a compiled update condition.");

    return this.db
      .update(table)
      .set(data)
      .where(condition)
      .returning() as unknown as Promise<T[]>;
  }

  async delete(tableName: string, where: QueryFilter): Promise<number> {
    this.assertSafeFilter("delete", tableName, where);
    const table = this.getTable(tableName);
    this.assertFilterFields(tableName, where);

    const condition = this.buildWhere(table, where);
    if (!condition) throw new Error("Expected a compiled delete condition.");

    const result = await this.db.delete(table).where(condition);
    return Array.isArray(result)
      ? result.length
      : ((result as { rowCount?: number }).rowCount ?? 0);
  }

  async transaction<T>(
    callback: (adapter: DatabaseAdapter) => Promise<T>,
  ): Promise<T> {
    const database = this.db as TransactionCapableDatabase;
    return database.transaction(async (tx) =>
      callback(new PostgreAdapter(tx, this.tables)),
    );
  }

  async createTables(
    tables: readonly TableMetadata[],
    options: SchemaCreationOptions = {},
  ): Promise<SchemaCreationResult> {
    const database = this.db as TransactionCapableDatabase;
    return database.transaction((tx) =>
      new PostgreAdapter(tx, this.tables).createTablesInTransaction(
        tables,
        options,
      ),
    );
  }

  async planMigrations(
    migrations: readonly MigrationArtifact[],
  ): Promise<MigrationPlan> {
    return {
      migrations: migrations.map((migration) => ({
        migrationId: migration.id,
        statements: migration.operations.flatMap((operation) =>
          this.renderMigrationOperation(operation),
        ),
      })),
      destructive: migrations.some((migration) =>
        migration.operations.some((operation) => operation.safety !== "safe"),
      ),
      irreversible: migrations.some((migration) =>
        migration.operations.some(
          (operation) => operation.safety === "irreversible",
        ),
      ),
    };
  }

  async migrationStatus(
    migrations: readonly MigrationArtifact[],
  ): Promise<MigrationStatusEntry[]> {
    await this.ensureMigrationHistory(this.db);
    const applied = await this.readAppliedMigrations(this.db);
    return migrations.map((migration) => {
      const record = applied.get(migration.id);
      if (record && record.checksum !== migration.checksum) {
        throw new MigrationChecksumError(migration.id);
      }
      return {
        id: migration.id,
        name: migration.name,
        checksum: migration.checksum,
        status: record?.status ?? "pending",
        ...(record?.appliedAt ? { appliedAt: record.appliedAt } : {}),
        ...(record?.error ? { error: record.error } : {}),
      };
    });
  }

  async applyMigrations(
    migrations: readonly MigrationArtifact[],
    options: ApplyMigrationsOptions = {},
  ): Promise<MigrationApplyResult> {
    const plan = await this.planMigrations(migrations);
    if (options.dryRun) {
      return { applied: [], skipped: [], plan, dryRun: true };
    }
    if ((plan.destructive || plan.irreversible) && !options.allowDestructive) {
      throw new DestructiveMigrationError();
    }
    await this.ensureMigrationHistory(this.db);
    const database = this.db as TransactionCapableDatabase;
    try {
      const result = await database.transaction((tx) =>
        this.applyMigrationsInTransaction(tx, migrations),
      );
      return { ...result, plan, dryRun: false };
    } catch (error) {
      if (error instanceof MigrationExecutionError) {
        await this.recordMigrationFailure(error.migration, error.cause);
      }
      throw error;
    }
  }

  private async applyMigrationsInTransaction(
    database: AnyPgDatabase,
    migrations: readonly MigrationArtifact[],
  ): Promise<{ applied: string[]; skipped: string[] }> {
    await database.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('opensya:persistence:migrations'))`,
    );
    const records = await this.readAppliedMigrations(database);
    const applied: string[] = [];
    const skipped: string[] = [];

    for (const migration of migrations) {
      const record = records.get(migration.id);
      if (record) {
        if (record.checksum !== migration.checksum) {
          throw new MigrationChecksumError(migration.id);
        }
        if (record.status === "applied") {
          skipped.push(migration.id);
          continue;
        }
      }

      const startedAt = performance.now();
      try {
        for (const operation of migration.operations) {
          for (const statement of this.renderMigrationOperation(operation)) {
            await database.execute(sql.raw(statement));
          }
        }
      } catch (error) {
        throw new MigrationExecutionError(migration, error);
      }
      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
      await database.execute(sql`
        INSERT INTO "_opensya_migrations"
          (id, name, checksum, status, applied_at, duration_ms, last_error)
        VALUES
          (${migration.id}, ${migration.name}, ${migration.checksum}, 'applied', NOW(), ${durationMs}, NULL)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          checksum = EXCLUDED.checksum,
          status = 'applied',
          applied_at = EXCLUDED.applied_at,
          duration_ms = EXCLUDED.duration_ms,
          last_error = NULL
      `);
      applied.push(migration.id);
    }

    return { applied, skipped };
  }

  private async ensureMigrationHistory(database: AnyPgDatabase): Promise<void> {
    await database.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "_opensya_migrations" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "checksum" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "applied_at" TIMESTAMPTZ,
        "duration_ms" INTEGER NOT NULL DEFAULT 0,
        "last_error" TEXT
      )
    `));
  }

  private async readAppliedMigrations(
    database: AnyPgDatabase,
  ): Promise<
    Map<
      string,
      {
        checksum: string;
        status: "applied" | "failed";
        appliedAt?: string;
        error?: string;
      }
    >
  > {
    const result = (await database.execute(sql`
      SELECT id, checksum, status, applied_at, last_error
      FROM "_opensya_migrations"
      ORDER BY applied_at NULLS LAST, id
    `)) as {
      rows: {
        id: string;
        checksum: string;
        status: "applied" | "failed";
        applied_at: Date | string | null;
        last_error: string | null;
      }[];
    };
    return new Map(
      result.rows.map((row) => [
        row.id,
        {
          checksum: row.checksum,
          status: row.status,
          ...(row.applied_at
            ? {
                appliedAt:
                  row.applied_at instanceof Date
                    ? row.applied_at.toISOString()
                    : new Date(row.applied_at).toISOString(),
              }
            : {}),
          ...(row.last_error ? { error: row.last_error } : {}),
        },
      ]),
    );
  }

  private async recordMigrationFailure(
    migration: MigrationArtifact,
    cause: unknown,
  ): Promise<void> {
    const message = cause instanceof Error ? cause.message : String(cause);
    await this.db.execute(sql`
      INSERT INTO "_opensya_migrations"
        (id, name, checksum, status, duration_ms, last_error)
      VALUES
        (${migration.id}, ${migration.name}, ${migration.checksum}, 'failed', 0, ${message})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        checksum = EXCLUDED.checksum,
        status = 'failed',
        applied_at = NULL,
        duration_ms = 0,
        last_error = EXCLUDED.last_error
    `);
  }

  private renderMigrationOperation(
    operation: MigrationOperation,
  ): string[] {
    switch (operation.kind) {
      case "createTable":
        return [this.createSnapshotTableStatement(operation.table)];
      case "dropTable":
        return [`DROP TABLE ${this.quoteIdentifier(operation.table.collectionName)}`];
      case "addColumn":
        return [
          `ALTER TABLE ${this.quoteIdentifier(operation.table)} ADD COLUMN ${this.snapshotColumnDefinition(operation.column)}`,
        ];
      case "dropColumn":
        return [
          `ALTER TABLE ${this.quoteIdentifier(operation.table)} DROP COLUMN ${this.quoteIdentifier(operation.column.columnName)}`,
        ];
      case "alterColumn":
        return this.alterSnapshotColumnStatements(
          operation.table,
          operation.before,
          operation.after,
        );
      case "createIndex":
        return [this.createSnapshotIndexStatement(operation.table, operation.index)];
      case "dropIndex":
        return [`DROP INDEX IF EXISTS ${this.quoteIdentifier(operation.index.name)}`];
      case "addForeignKey":
        return [
          this.addSnapshotForeignKeyStatement(
            operation.table,
            operation.foreignKey,
          ),
        ];
      case "dropForeignKey":
        return [
          `ALTER TABLE ${this.quoteIdentifier(operation.table)} DROP CONSTRAINT IF EXISTS ${this.quoteIdentifier(operation.foreignKey.name)}`,
        ];
    }
  }

  private createSnapshotTableStatement(table: SchemaTableSnapshot): string {
    const definitions = table.columns.map((column) =>
      this.snapshotColumnDefinition(column, false),
    );
    const primaryKeys = table.columns.filter((column) => column.primaryKey);
    if (primaryKeys.length) {
      definitions.push(
        `PRIMARY KEY (${primaryKeys
          .map((column) => this.quoteIdentifier(column.columnName))
          .join(", ")})`,
      );
    }
    return `CREATE TABLE ${this.quoteIdentifier(table.collectionName)} (${definitions.join(", ")})`;
  }

  private snapshotColumnDefinition(
    column: SchemaColumnSnapshot,
    includePrimaryKey = true,
  ): string {
    const parts = [
      this.quoteIdentifier(column.columnName),
      this.snapshotColumnTypeToSql(column),
    ];
    if (!column.nullable) parts.push("NOT NULL");
    if (column.unique && !column.primaryKey) parts.push("UNIQUE");
    if (includePrimaryKey && column.primaryKey) parts.push("PRIMARY KEY");
    const defaultSql = this.snapshotDefaultToSql(column);
    if (defaultSql !== undefined) parts.push(`DEFAULT ${defaultSql}`);
    return parts.join(" ");
  }

  private alterSnapshotColumnStatements(
    table: string,
    before: SchemaColumnSnapshot,
    after: SchemaColumnSnapshot,
  ): string[] {
    const prefix = `ALTER TABLE ${this.quoteIdentifier(table)}`;
    const column = this.quoteIdentifier(after.columnName);
    const statements: string[] = [];
    if (before.type !== after.type) {
      statements.push(
        `${prefix} ALTER COLUMN ${column} TYPE ${this.snapshotColumnTypeToSql(after)}`,
      );
    }
    if (before.nullable !== after.nullable) {
      statements.push(
        `${prefix} ALTER COLUMN ${column} ${after.nullable ? "DROP" : "SET"} NOT NULL`,
      );
    }
    if (stableStringify(before.default) !== stableStringify(after.default)) {
      const defaultSql = this.snapshotDefaultToSql(after);
      statements.push(
        defaultSql === undefined
          ? `${prefix} ALTER COLUMN ${column} DROP DEFAULT`
          : `${prefix} ALTER COLUMN ${column} SET DEFAULT ${defaultSql}`,
      );
    }
    if (before.unique !== after.unique) {
      const constraint = this.quoteIdentifier(
        this.constraintName(table, after.columnName, "key"),
      );
      statements.push(
        after.unique
          ? `${prefix} ADD CONSTRAINT ${constraint} UNIQUE (${column})`
          : `${prefix} DROP CONSTRAINT IF EXISTS ${constraint}`,
      );
    }
    if (before.primaryKey !== after.primaryKey) {
      const constraint = this.quoteIdentifier(
        this.constraintName(table, "", "pkey"),
      );
      statements.push(
        after.primaryKey
          ? `${prefix} ADD CONSTRAINT ${constraint} PRIMARY KEY (${column})`
          : `${prefix} DROP CONSTRAINT IF EXISTS ${constraint}`,
      );
    }
    return statements;
  }

  private createSnapshotIndexStatement(
    table: string,
    index: SchemaIndexSnapshot,
  ): string {
    return `CREATE ${index.unique ? "UNIQUE " : ""}INDEX ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(table)} (${index.fields.map((field) => this.quoteIdentifier(field)).join(", ")})`;
  }

  private addSnapshotForeignKeyStatement(
    table: string,
    foreignKey: SchemaForeignKeySnapshot,
  ): string {
    return `ALTER TABLE ${this.quoteIdentifier(table)} ADD CONSTRAINT ${this.quoteIdentifier(foreignKey.name)} FOREIGN KEY (${this.quoteIdentifier(foreignKey.field)}) REFERENCES ${this.quoteIdentifier(foreignKey.targetTable)} (${this.quoteIdentifier(foreignKey.targetField)})`;
  }

  private snapshotColumnTypeToSql(column: SchemaColumnSnapshot): string {
    return this.columnTypeToSql(column);
  }

  private snapshotDefaultToSql(
    column: SchemaColumnSnapshot,
  ): string | undefined {
    if (!column.default || column.default.kind === "runtime") return undefined;
    return this.migrationValueToSql(column, column.default.value);
  }

  private migrationValueToSql(
    column: SchemaColumnSnapshot,
    value: MigrationValue,
  ): string {
    if (value === null) return "NULL";
    if (column.type === "json") {
      return `${this.quoteLiteral(JSON.stringify(this.migrationJsonValue(value)))}::jsonb`;
    }
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    if (typeof value === "number") return value.toString();
    if (typeof value === "string") return this.quoteLiteral(value);
    if (!Array.isArray(value) && value.$type === "bigint") {
      return String(value.value);
    }
    if (!Array.isArray(value) && value.$type === "date") {
      return this.quoteLiteral(String(value.value));
    }
    throw new Error(
      `Unsupported static migration default for column "${column.name}".`,
    );
  }

  private migrationJsonValue(value: MigrationValue): unknown {
    if (Array.isArray(value)) return value.map((item) => this.migrationJsonValue(item));
    if (value !== null && typeof value === "object") {
      if (value.$type === "bigint" || value.$type === "date") {
        return value.value;
      }
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          this.migrationJsonValue(item),
        ]),
      );
    }
    return value;
  }

  private constraintName(table: string, column: string, suffix: string): string {
    return [table, column, suffix].filter(Boolean).join("_").slice(0, 63);
  }

  /**
   * Real introspection via information_schema and the pg_catalog index
   * tables — independent from any Drizzle schema already built (works even
   * for tables never passed to buildTable()).
   *
   * Known limitations for this first pass:
   * - relations (foreign keys) are not introspected (always [])
   * - unrecognized SQL types fall back to 'text'
   */
  async introspect(): Promise<TableMetadata[]> {
    const tablesResult = (await this.db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `)) as { rows: { table_name: string }[] };

    const tables: TableMetadata[] = [];

    for (const { table_name: tableName } of tablesResult.rows) {
      const columnsResult = (await this.db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `)) as {
        rows: { column_name: string; data_type: string; is_nullable: string }[];
      };

      const pkResult = (await this.db.execute(sql`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public' AND tc.table_name = ${tableName}
      `)) as { rows: { column_name: string }[] };

      const primaryKeyColumns = new Set(
        pkResult.rows.map((r) => r.column_name),
      );

      // Every index on the table, PK included — pg_index is the single
      // source of truth Postgres uses internally for both explicit
      // `CREATE INDEX` statements and the indexes backing PRIMARY KEY /
      // UNIQUE constraints, so this one query covers all three.
      const indexResult = (await this.db.execute(sql`
        SELECT
          ic.relname AS index_name,
          ix.indisunique AS is_unique,
          ix.indisprimary AS is_primary,
          array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns
        FROM pg_class tc
        JOIN pg_namespace n ON n.oid = tc.relnamespace
        JOIN pg_index ix ON tc.oid = ix.indrelid
        JOIN pg_class ic ON ic.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = ANY(ix.indkey)
        WHERE n.nspname = 'public' AND tc.relname = ${tableName}
        GROUP BY ic.relname, ix.indisunique, ix.indisprimary
      `)) as {
        rows: {
          index_name: string;
          is_unique: boolean;
          is_primary: boolean;
          columns: string[];
        }[];
      };

      // A single-column unique index that isn't the PK is exactly what a
      // column-level UNIQUE constraint produces in Postgres — surface it
      // through ColumnMetadata.unique rather than as a standalone index.
      const singleColumnUniques = new Set(
        indexResult.rows
          .filter(
            (row) =>
              row.is_unique && !row.is_primary && row.columns.length === 1,
          )
          .map((row) => row.columns[0]),
      );

      const indexes: IndexMetadata[] = indexResult.rows
        .filter((row) => !row.is_primary)
        .filter((row) => !(row.is_unique && row.columns.length === 1))
        .map((row) => ({
          name: row.index_name,
          fields: row.columns,
          unique: row.is_unique,
        }));

      const columns: ColumnMetadata[] = columnsResult.rows.map((row) => ({
        name: row.column_name,
        columnName: row.column_name,
        type: this.mapSqlTypeToColumnType(row.data_type),
        nullable: row.is_nullable === "YES",
        primaryKey: primaryKeyColumns.has(row.column_name),
        unique: singleColumnUniques.has(row.column_name),
        validators: [],
      }));

      tables.push({
        name: tableName,
        collectionName: tableName,
        columns,
        relations: [],
        tableValidators: [],
        indexes,
      });
    }

    return tables;
  }

  private async createTablesInTransaction(
    tables: readonly TableMetadata[],
    options: SchemaCreationOptions,
  ): Promise<SchemaCreationResult> {
    const existing = new Set(
      (await this.introspect()).map((table) => table.collectionName),
    );
    const result: SchemaCreationResult = { created: [], skipped: [] };

    for (const table of tables) {
      await this.db.execute(sql.raw(this.createTableStatement(table)));
      (existing.has(table.collectionName) ? result.skipped : result.created).push(
        table.name,
      );
    }

    for (const table of tables) {
      for (const declared of table.indexes ?? []) {
        await this.db.execute(sql.raw(this.createIndexStatement(table, declared)));
      }
    }

    if (options.foreignKeys !== false) {
      const byName = new Map(tables.map((table) => [table.name, table]));
      for (const table of tables) {
        for (const relation of table.relations) {
          await this.createForeignKey(table, relation, byName);
        }
      }
    }

    return result;
  }

  private createTableStatement(table: TableMetadata): string {
    const columns = table.columns.map((column) =>
      this.createColumnDefinition(column),
    );
    const primaryKeys = table.columns.filter((column) => column.primaryKey);

    if (primaryKeys.length) {
      columns.push(
        `PRIMARY KEY (${primaryKeys
          .map((column) => this.quoteIdentifier(column.columnName))
          .join(", ")})`,
      );
    }

    return `CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(table.collectionName)} (${columns.join(", ")})`;
  }

  private createColumnDefinition(column: ColumnMetadata): string {
    const parts = [
      this.quoteIdentifier(column.columnName),
      this.columnTypeToSql(column),
    ];

    if (!column.nullable) parts.push("NOT NULL");
    if (column.unique && !column.primaryKey) parts.push("UNIQUE");
    if (column.default !== undefined && typeof column.default !== "function") {
      parts.push(`DEFAULT ${this.defaultValueToSql(column, column.default)}`);
    }

    return parts.join(" ");
  }

  private createIndexStatement(
    table: TableMetadata,
    declared: IndexMetadata,
  ): string {
    const fields = declared.fields.map((field) => {
      const column = table.columns.find((candidate) => candidate.name === field);
      if (!column) {
        throw new Error(
          `Index "${declared.name}" references unknown field "${field}" on table "${table.name}".`,
        );
      }
      return this.quoteIdentifier(column.columnName);
    });
    const unique = declared.unique ? "UNIQUE " : "";
    return `CREATE ${unique}INDEX IF NOT EXISTS ${this.quoteIdentifier(declared.name)} ON ${this.quoteIdentifier(table.collectionName)} (${fields.join(", ")})`;
  }

  private async createForeignKey(
    source: TableMetadata,
    relation: RelationMetadata,
    tables: ReadonlyMap<string, TableMetadata>,
  ): Promise<void> {
    if (relation.kind !== "manyToOne" && relation.kind !== "oneToOne") return;

    const target = tables.get(relation.target);
    if (!target) {
      throw new Error(
        `Relation "${relation.name}" targets table "${relation.target}", which was not provided for schema creation.`,
      );
    }

    const sourceColumn = this.getMetadataColumn(source, relation.foreignKey);
    const targetColumn = this.getMetadataColumn(
      target,
      relation.references ?? "id",
    );
    const existing = (await this.db.execute(sql`
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.constraint_schema = ccu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = ${source.collectionName}
        AND kcu.column_name = ${sourceColumn.columnName}
        AND ccu.table_schema = 'public'
        AND ccu.table_name = ${target.collectionName}
        AND ccu.column_name = ${targetColumn.columnName}
      LIMIT 1
    `)) as { rows: unknown[] };

    if (existing.rows.length) return;

    const constraintName = this.foreignKeyName(source, relation);
    await this.db.execute(sql.raw(
      `ALTER TABLE ${this.quoteIdentifier(source.collectionName)} ` +
        `ADD CONSTRAINT ${this.quoteIdentifier(constraintName)} ` +
        `FOREIGN KEY (${this.quoteIdentifier(sourceColumn.columnName)}) ` +
        `REFERENCES ${this.quoteIdentifier(target.collectionName)} (${this.quoteIdentifier(targetColumn.columnName)})`,
    ));
  }

  private getMetadataColumn(
    table: TableMetadata,
    field: string,
  ): ColumnMetadata {
    const column = table.columns.find((candidate) => candidate.name === field);
    if (!column) {
      throw new Error(`Unknown field "${field}" on table "${table.name}".`);
    }
    return column;
  }

  private foreignKeyName(
    table: TableMetadata,
    relation: RelationMetadata,
  ): string {
    const name = `persistence_${table.collectionName}_${relation.name}_fk`;
    if (name.length <= 63) return name;

    let hash = 2166136261;
    for (const character of name) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    const suffix = (hash >>> 0).toString(16).padStart(8, "0");
    return `${name.slice(0, 54)}_${suffix}`;
  }

  private columnTypeToSql(column: Pick<ColumnMetadata, "type">): string {
    switch (column.type) {
      case "uuid":
        return "UUID";
      case "string":
      case "text":
        return "TEXT";
      case "integer":
        return "INTEGER";
      case "bigint":
        return "BIGINT";
      case "boolean":
        return "BOOLEAN";
      case "timestamp":
        return "TIMESTAMP";
      case "date":
        return "DATE";
      case "json":
        return "JSONB";
      case "decimal":
        return "NUMERIC";
    }
  }

  private defaultValueToSql(
    column: ColumnMetadata,
    value: unknown,
  ): string {
    if (value === null) return "NULL";
    if (column.type === "json") {
      const jsonValue = JSON.stringify(value);
      if (jsonValue === undefined) {
        throw new Error(
          `Unsupported static database default for "${column.name}".`,
        );
      }
      return `${this.quoteLiteral(jsonValue)}::jsonb`;
    }
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error("Database defaults must be finite numbers.");
      }
      return value.toString();
    }
    if (value instanceof Date) {
      const serialized =
        column.type === "date"
          ? value.toISOString().slice(0, 10)
          : value.toISOString();
      return this.quoteLiteral(serialized);
    }
    if (typeof value === "string") return this.quoteLiteral(value);
    throw new Error(
      `Unsupported static database default for "${column.name}".`,
    );
  }

  private quoteIdentifier(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
  }

  private quoteLiteral(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
  }

  private mapSqlTypeToColumnType(sqlType: string): ColumnMetadata["type"] {
    switch (sqlType) {
      case "uuid":
        return "uuid";
      case "character varying":
        return "string";
      case "text":
        return "text";
      case "integer":
        return "integer";
      case "bigint":
        return "bigint";
      case "boolean":
        return "boolean";
      case "timestamp without time zone":
      case "timestamp with time zone":
        return "timestamp";
      case "date":
        return "date";
      case "json":
      case "jsonb":
        return "json";
      case "numeric":
        return "decimal";
      default:
        // Unrecognized SQL type: documented fallback rather than a throw —
        // a reported drift is preferable to a crash.
        return "text";
    }
  }

  private buildWhere(table: BuiltTable, filter?: QueryFilter): SQL | undefined {
    if (!hasFilterConstraints(filter)) return undefined;

    const parts: SQL[] = [];

    if (filter?.conditions?.length) {
      parts.push(
        ...filter.conditions.map((condition) =>
          this.buildCondition(table, condition),
        ),
      );
    }

    if (filter?.and?.length) {
      const nested = filter.and
        .map((item) => this.buildWhere(table, item))
        .filter((item): item is SQL => Boolean(item));
      if (nested.length) parts.push(and(...nested)!);
    }

    if (filter?.or?.length) {
      const nested = filter.or
        .map((item) => this.buildWhere(table, item))
        .filter((item): item is SQL => Boolean(item));
      if (nested.length) parts.push(or(...nested)!);
    }

    if (filter?.not) {
      const nested = this.buildWhere(table, filter.not);
      if (nested) parts.push(not(nested));
    }

    return parts.length === 1 ? parts[0] : and(...parts);
  }

  private buildCondition(table: BuiltTable, condition: FilterCondition): SQL {
    const column = table[condition.field];

    switch (condition.operator) {
      case "eq":
        return eq(column, condition.value);
      case "ne":
        return ne(column, condition.value);
      case "in":
        return inArray(column, this.requireArray(condition));
      case "notIn":
        return notInArray(column, this.requireArray(condition));
      case "gt":
        return gt(column, condition.value);
      case "gte":
        return gte(column, condition.value);
      case "lt":
        return lt(column, condition.value);
      case "lte":
        return lte(column, condition.value);
      case "isNull":
        return condition.value === false ? isNotNull(column) : isNull(column);
    }
  }

  private requireArray(condition: FilterCondition): unknown[] {
    if (!Array.isArray(condition.value)) {
      throw new Error(
        `Operator "${condition.operator}" requires an array value.`,
      );
    }
    if (condition.value.length === 0) {
      throw new Error(
        `Operator "${condition.operator}" rejects an empty array.`,
      );
    }
    return condition.value;
  }

  private assertSafeFilter(
    operation: "update" | "delete",
    tableName: string,
    where: QueryFilter,
  ): void {
    if (!hasFilterConstraints(where)) {
      throw new Error(
        `Unsafe ${operation} rejected for table "${tableName}": a non-empty filter is required.`,
      );
    }
  }

  private assertQueryFields(tableName: string, params: QueryParams): void {
    if (params.limit !== undefined && params.limit < 0) {
      throw new Error("Query limit must be greater than or equal to zero.");
    }
    if (params.offset !== undefined && params.offset < 0) {
      throw new Error("Query offset must be greater than or equal to zero.");
    }
    this.assertFilterFields(tableName, params.where);
    this.assertFields(
      tableName,
      params.orderBy?.map((item) => item.field) ?? [],
    );
  }

  private assertFilterFields(tableName: string, filter?: QueryFilter): void {
    if (!filter) return;
    this.assertFields(
      tableName,
      filter.conditions?.map((item) => item.field) ?? [],
    );
    filter.and?.forEach((item) => this.assertFilterFields(tableName, item));
    filter.or?.forEach((item) => this.assertFilterFields(tableName, item));
    this.assertFilterFields(tableName, filter.not);
  }

  private assertFields(tableName: string, fields: string[]): void {
    const table = this.getTable(tableName);
    for (const field of fields) {
      if (!(field in table)) {
        throw new Error(`Unknown field "${field}" on table "${tableName}".`);
      }
    }
  }

  private getTable(name: string): BuiltTable {
    const table = this.tables.get(name);
    if (!table) {
      throw new Error(
        `Table "${name}" has not been built. Call buildTable() during startup.`,
      );
    }
    return table;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildColumn(column: ColumnMetadata): PgColumnBuilder<any> {
    let builder = this.baseColumnBuilder(column);
    if (column.primaryKey) builder = builder.primaryKey();
    if (!column.nullable) builder = builder.notNull();
    if (column.unique) builder = builder.unique();
    if (column.default !== undefined) {
      builder =
        typeof column.default === "function"
          ? builder.$defaultFn(column.default as () => unknown)
          : builder.default(column.default);
    }
    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private baseColumnBuilder(column: ColumnMetadata): PgColumnBuilder<any> {
    switch (column.type) {
      case "uuid":
        return uuid(column.columnName);
      case "string":
      case "text":
        return text(column.columnName);
      case "integer":
        return integer(column.columnName);
      case "bigint":
        return bigint(column.columnName, { mode: "bigint" });
      case "boolean":
        return boolean(column.columnName);
      case "timestamp":
        return timestamp(column.columnName);
      case "date":
        return date(column.columnName);
      case "json":
        return json(column.columnName);
      case "decimal":
        return numeric(column.columnName);
    }
  }
}

export function createPostgreAdapter(db: AnyPgDatabase): PostgreAdapter {
  return new PostgreAdapter(db);
}
