import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  json,
  numeric,
  uuid,
  type PgColumnBuilder,
  type PgTableWithColumns,
  type PgAsyncDatabase,
} from "drizzle-orm/pg-core";
import { eq, and, asc, desc, type SQL } from "drizzle-orm";
import type { TableMetadata, ColumnMetadata } from "../metadata/types.js";
import type { DatabaseAdapter, QueryFilter, QueryParams } from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPgDatabase = PgAsyncDatabase<any, any, any, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BuiltTable = PgTableWithColumns<any>;

export class DrizzleAdapter implements DatabaseAdapter {
  private readonly db: AnyPgDatabase;
  private readonly tables = new Map<string, BuiltTable>();

  constructor(db: AnyPgDatabase) {
    this.db = db;
  }

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
        return text(column.columnName);
      case "text":
        return text(column.columnName);
      case "integer":
        return integer(column.columnName);
      case "bigint":
        return bigint(column.columnName, { mode: "number" });
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
      default: {
        const exhaustiveCheck: never = column.type;
        throw new Error(
          `Type de colonne non géré : ${String(exhaustiveCheck)}`,
        );
      }
    }
  }

  private getTable(name: string): BuiltTable {
    const table = this.tables.get(name);
    if (!table) {
      throw new Error(
        `Table "${name}" non construite dans l'adapter. Appeler buildTable() au démarrage avant toute requête.`,
      );
    }
    return table;
  }

  private buildWhere(table: BuiltTable, where?: QueryFilter): SQL | undefined {
    if (!where) return undefined;
    const conditions = Object.entries(where).map(([field, value]) =>
      eq(table[field], value),
    );
    return conditions.length ? and(...conditions) : undefined;
  }

  async findMany<T = Record<string, unknown>>(
    tableName: string,
    params: QueryParams,
  ): Promise<T[]> {
    const table = this.getTable(tableName);
    let query = this.db.select().from(table).$dynamic();

    const where = this.buildWhere(table, params.where);
    if (where) query = query.where(where);

    if (params.orderBy) {
      query = query.orderBy(
        ...params.orderBy.map((o) =>
          o.direction === "asc" ? asc(table[o.field]) : desc(table[o.field]),
        ),
      );
    }
    if (params.limit !== undefined) query = query.limit(params.limit);
    if (params.offset !== undefined) query = query.offset(params.offset);

    return query as unknown as Promise<T[]>;
  }

  async findOne<T = Record<string, unknown>>(
    tableName: string,
    params: QueryParams,
  ): Promise<T | null> {
    const results = await this.findMany<T>(tableName, { ...params, limit: 1 });
    return results[0] ?? null;
  }

  async insert<T = Record<string, unknown>>(
    tableName: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    const table = this.getTable(tableName);
    const [row] = await this.db.insert(table).values(data).returning();
    return row as T;
  }

  async update<T = Record<string, unknown>>(
    tableName: string,
    where: QueryFilter,
    data: Record<string, unknown>,
  ): Promise<T[]> {
    const table = this.getTable(tableName);
    const condition = this.buildWhere(table, where);
    const base = this.db.update(table).set(data);
    const rows = condition
      ? await base.where(condition).returning()
      : await base.returning();
    return rows as T[];
  }

  async delete(tableName: string, where: QueryFilter): Promise<number> {
    const table = this.getTable(tableName);
    const condition = this.buildWhere(table, where);
    const base = this.db.delete(table);
    const result = condition ? await base.where(condition) : await base;
    return Array.isArray(result)
      ? result.length
      : ((result as { rowCount?: number }).rowCount ?? 0);
  }

  async introspect(): Promise<TableMetadata[]> {
    throw new Error("introspect() sera implémenté avec le consistency-check.");
  }
}

export function createDrizzleAdapter(db: AnyPgDatabase): DrizzleAdapter {
  return new DrizzleAdapter(db);
}
