import type { ColumnMetadata, TableMetadata } from "./types.js";

export type TableMetadataMap = Record<string, TableMetadata>;

export type TablesToMetadataMap<
  TTables extends readonly TableMetadata[],
> = {
  [TTable in TTables[number] as TTable["name"]]: TTable;
};

type ColumnBaseValue<TColumn extends ColumnMetadata> =
  TColumn["type"] extends "uuid" | "string" | "text" | "date"
    ? string
    : TColumn["type"] extends "integer"
      ? number
      : TColumn["type"] extends "bigint"
        ? bigint
        : TColumn["type"] extends "boolean"
          ? boolean
          : TColumn["type"] extends "timestamp"
            ? Date
            : TColumn["type"] extends "decimal"
              ? string | number
              : TColumn["type"] extends "json"
                ? TColumn extends { $type: infer TJson }
                  ? TJson
                  : unknown
                : never;

export type InferColumnValue<TColumn extends ColumnMetadata> =
  TColumn["nullable"] extends true
    ? ColumnBaseValue<TColumn> | null
    : ColumnBaseValue<TColumn>;

type TableColumn<TTable extends TableMetadata> = TTable["columns"][number];

type RequiredEntityFields<TTable extends TableMetadata> = {
  -readonly [TColumn in TableColumn<TTable> as TColumn extends {
    hidden: true;
  }
    ? never
    : TColumn extends { visibility: (...args: never[]) => unknown }
      ? never
      : TColumn["name"]]: InferColumnValue<TColumn>;
};

type ConditionalEntityFields<TTable extends TableMetadata> = {
  -readonly [TColumn in TableColumn<TTable> as TColumn extends {
    hidden: true;
  }
    ? never
    : TColumn extends { visibility: (...args: never[]) => unknown }
      ? TColumn["name"]
      : never]?: InferColumnValue<TColumn>;
};

type Simplify<T> = { [TKey in keyof T]: T[TKey] } & {};

/** Infers the serialized entity returned by QueryEngine for a table. */
export type InferTableEntity<TTable extends TableMetadata> = Simplify<
  RequiredEntityFields<TTable> & ConditionalEntityFields<TTable>
>;

type InternalEntityFields<TTable extends TableMetadata> = {
  -readonly [TColumn in TableColumn<TTable> as TColumn["name"]]: InferColumnValue<TColumn>;
};

/** Infers the complete, unserialized entity available to internal reads. */
export type InferInternalTableEntity<TTable extends TableMetadata> = Simplify<
  InternalEntityFields<TTable>
>;

export type RegisteredTableName<TTables extends TableMetadataMap> =
  Extract<keyof TTables, string> extends never
    ? string
    : Extract<keyof TTables, string>;

export type InferRegisteredEntity<
  TTables extends TableMetadataMap,
  TName extends string,
> = TName extends keyof TTables
  ? TTables[TName] extends TableMetadata
    ? InferTableEntity<TTables[TName]>
    : Record<string, unknown>
  : Record<string, unknown>;

export type InferRegisteredInternalEntity<
  TTables extends TableMetadataMap,
  TName extends string,
> = TName extends keyof TTables
  ? TTables[TName] extends TableMetadata
    ? InferInternalTableEntity<TTables[TName]>
    : Record<string, unknown>
  : Record<string, unknown>;

export type ResolveEntityType<
  TExplicit,
  TTables extends TableMetadataMap,
  TName extends string,
> = [TExplicit] extends [never]
  ? InferRegisteredEntity<TTables, TName>
  : TExplicit;

export type ResolveInternalEntityType<
  TExplicit,
  TTables extends TableMetadataMap,
  TName extends string,
> = [TExplicit] extends [never]
  ? InferRegisteredInternalEntity<TTables, TName>
  : TExplicit;

/** Declares a compile-time-only type without creating a runtime value. */
export function like<T>(): T {
  return undefined as T;
}

/** Preserves table and column literals while validating TableMetadata. */
export function defineTable<const TTable extends TableMetadata>(
  table: TTable,
): TTable {
  return table;
}
