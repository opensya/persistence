import type { TableMetadata } from "../metadata/types.js";

export interface QueryFilter {
  [field: string]: unknown;
}

export interface QueryParams {
  where?: QueryFilter;
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: "asc" | "desc" }[];
}

export interface DatabaseAdapter {
  findMany<T = Record<string, unknown>>(
    table: string,
    params: QueryParams,
  ): Promise<T[]>;
  findOne<T = Record<string, unknown>>(
    table: string,
    params: QueryParams,
  ): Promise<T | null>;
  insert<T = Record<string, unknown>>(
    table: string,
    data: Record<string, unknown>,
  ): Promise<T>;
  update<T = Record<string, unknown>>(
    table: string,
    where: QueryFilter,
    data: Record<string, unknown>,
  ): Promise<T[]>;
  delete(table: string, where: QueryFilter): Promise<number>;

  buildTable(meta: TableMetadata): unknown;

  introspect(): Promise<TableMetadata[]>;
}
