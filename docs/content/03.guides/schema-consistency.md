---
title: Schema consistency
description: Detect drift between declared metadata and live PostgreSQL tables.
navigation:
  icon: i-tabler-database-search
---

The consistency checker is read-only. It compares the locked registry with
`DatabaseAdapter.introspect()` and never changes the database.

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

Run the check in CI against a migrated PostgreSQL database, during non-production
startup, or as a deployment diagnostic. A clean check complements migrations;
it does not replace them.
