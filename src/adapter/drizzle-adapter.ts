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
  integer,
  json,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  type PgAsyncDatabase,
  type PgColumnBuilder,
  type PgTableWithColumns,
} from "drizzle-orm/pg-core";
import type { ColumnMetadata, TableMetadata } from "../metadata/types.js";
import {
  hasFilterConstraints,
  type DatabaseAdapter,
  type FilterCondition,
  type QueryFilter,
  type QueryParams,
} from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPgDatabase = PgAsyncDatabase<any, any, any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BuiltTable = PgTableWithColumns<any>;

type TransactionCapableDatabase = AnyPgDatabase & {
  transaction<T>(callback: (tx: AnyPgDatabase) => Promise<T>): Promise<T>;
};

export class DrizzleAdapter implements DatabaseAdapter {
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

    const table = pgTable(meta.collectionName, columns) as BuiltTable;
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
      callback(new DrizzleAdapter(tx, this.tables)),
    );
  }

  /**
   * Real introspection via information_schema — independent from any
   * Drizzle schema already built (works even for tables never passed to
   * buildTable()).
   *
   * Known limitations for this first pass:
   * - `unique` is not introspected (always false)
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

      const columns: ColumnMetadata[] = columnsResult.rows.map((row) => ({
        name: row.column_name,
        columnName: row.column_name,
        type: this.mapSqlTypeToColumnType(row.data_type),
        nullable: row.is_nullable === "YES",
        primaryKey: primaryKeyColumns.has(row.column_name),
        unique: false,
        validators: [],
      }));

      tables.push({
        name: tableName,
        collectionName: tableName,
        columns,
        relations: [],
        tableValidators: [],
      });
    }

    return tables;
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

export function createDrizzleAdapter(db: AnyPgDatabase): DrizzleAdapter {
  return new DrizzleAdapter(db);
}
