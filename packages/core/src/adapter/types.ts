import type { TableMetadata } from "../metadata/types.js";
import type {
  ApplyMigrationsOptions,
  MigrationApplyResult,
  MigrationArtifact,
  MigrationPlan,
  MigrationStatusEntry,
} from "../migrations/types.js";

export interface SchemaCreationOptions {
  /** Create declared foreign-key constraints when the adapter supports them. */
  foreignKeys?: boolean;
}

export interface SchemaCreationResult {
  /** Logical metadata names for resources created by this call. */
  created: string[];
  /** Logical metadata names whose physical resources already existed. */
  skipped: string[];
}

export type FilterOperator =
  | "eq"
  | "ne"
  | "in"
  | "notIn"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "isNull";

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface QueryFilter {
  conditions?: FilterCondition[];
  and?: QueryFilter[];
  or?: QueryFilter[];
  not?: QueryFilter;
}

export interface QueryParams {
  where?: QueryFilter | undefined;
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: "asc" | "desc" }[];
}

export type AggregateFunction = "count" | "sum" | "avg" | "min" | "max";

export interface AggregateMetric {
  function: AggregateFunction;
  /** Optional only for count, where omission means COUNT(*). */
  field?: string;
}

export interface AggregateQuery {
  where?: QueryFilter;
  groupBy?: string[];
  metrics: Record<string, AggregateMetric>;
}

export type AggregateRow<
  TQuery extends AggregateQuery = AggregateQuery,
> = Record<
  TQuery["groupBy"] extends readonly string[]
    ? TQuery["groupBy"][number]
    : never,
  unknown
> &
  Record<keyof TQuery["metrics"], unknown>;

export interface DatabaseAdapter {
  findMany<T = Record<string, unknown>>(
    table: string,
    params?: QueryParams,
  ): Promise<T[]>;

  findOne<T = Record<string, unknown>>(
    table: string,
    params?: QueryParams,
  ): Promise<T | null>;

  /** Optional native aggregation capability. */
  aggregate?(
    table: string,
    query: AggregateQuery,
  ): Promise<AggregateRow[]>;

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

  transaction<T>(
    callback: (adapter: DatabaseAdapter) => Promise<T>,
  ): Promise<T>;

  buildTable(meta: TableMetadata): unknown;
  introspect(): Promise<TableMetadata[]>;

  /**
   * Optional schema-management capability. Adapters that implement it can
   * create their physical resources from Persistence metadata.
   */
  createTables?(
    tables: readonly TableMetadata[],
    options?: SchemaCreationOptions,
  ): Promise<SchemaCreationResult>;

  planMigrations?(
    migrations: readonly MigrationArtifact[],
  ): Promise<MigrationPlan>;

  migrationStatus?(
    migrations: readonly MigrationArtifact[],
  ): Promise<MigrationStatusEntry[]>;

  applyMigrations?(
    migrations: readonly MigrationArtifact[],
    options?: ApplyMigrationsOptions,
  ): Promise<MigrationApplyResult>;
}

export function hasFilterConstraints(filter: QueryFilter | undefined): boolean {
  if (!filter) return false;
  if (filter.conditions?.length) return true;
  if (filter.and?.some(hasFilterConstraints)) return true;
  if (filter.or?.some(hasFilterConstraints)) return true;
  if (filter.not && hasFilterConstraints(filter.not)) return true;
  return false;
}
