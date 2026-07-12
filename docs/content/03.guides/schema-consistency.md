---
title: Schema consistency
description: Detect drift between declared metadata and live PostgreSQL tables.
navigation:
  icon: i-tabler-database-search
---

## Create missing tables

```ts
const result = await engine.schema.createTables()

console.log(result.created)
console.log(result.skipped)
```

Schema creation delegates physical operations to the active adapter. It
creates missing resources and declared indexes, but never removes tables,
columns or application data. The registry must be locked first. Adapters that
do not implement schema creation throw `SchemaCreationNotSupportedError`.

The Drizzle PostgreSQL adapter creates all tables before adding foreign keys,
so relational dependencies and cycles do not require manual ordering.

## Detect drift

The consistency checker remains read-only. It compares the locked registry
with `DatabaseAdapter.introspect()` and never changes the database.

```ts
const checker = createConsistencyChecker(registry, adapter)
const drift = await checker.check()

if (drift.length) {
  for (const table of drift) {
    console.error(table.table, table.issues)
  }
}
```

## Detected drift

- missing declared tables;
- missing or unexpected columns;
- mapped type mismatches;
- nullability mismatches;
- primary-key mismatches;
- single-column uniqueness mismatches;
- missing, unexpected or changed declared indexes;
- composite index field order and uniqueness mismatches.

```ts
interface SchemaDrift {
  table: string
  issues: string[]
}
```

An empty array means the currently supported properties match.

## Introspection boundaries

PostgreSQL introspection currently reads base tables in the `public` schema,
columns, primary keys and indexes. Single-column unique indexes are surfaced as
`ColumnMetadata.unique`; other indexes become `TableMetadata.indexes`.

It does not reconstruct:

- validators or lifecycle behavior;
- relation metadata and foreign keys;
- database defaults;
- check constraints;
- non-public schemas and views;
- precision, scale and length details.

Declared metadata remains the domain source of truth.

## Operational use

Run the check in CI against PostgreSQL, during non-production startup, or as a
deployment diagnostic. Schema creation initializes missing resources; the
consistency checker identifies differences that require an explicit migration.
