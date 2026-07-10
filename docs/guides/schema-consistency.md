---
title: Schema consistency
description: Compare declared metadata with the live PostgreSQL public schema.
navigation:
  icon: i-tabler-database-search
---

The consistency checker detects drift between the metadata registry and the schema reported by a database adapter.

## Run a check

```ts
import { createConsistencyChecker } from '@opensya/persistence'

const checker = createConsistencyChecker(registry, adapter)
const drift = await checker.check()

for (const table of drift) {
  console.error(table.table, table.issues)
}
```

```ts
interface SchemaDrift {
  table: string
  issues: string[]
}
```

An empty array means that every declared table and column matched the introspected representation for the properties currently compared.

## Comparison process

::u-steps{level="3"}
### Introspect the database
The checker calls `adapter.introspect()`.

### Match physical table names
Actual tables are indexed by `collectionName`.

### Compare declared columns
Columns are matched through `columnName`.

### Report drift
Issues are grouped by the logical declared table name.
::

## Detected drift

::u-accordion
  :::u-accordion-item{label="Missing table" icon="i-tabler-table-off"}
  A metadata table has no physical table with the same `collectionName`.
  :::

  :::u-accordion-item{label="Missing column" icon="i-tabler-column-remove"}
  A declared `columnName` does not exist in the introspected table.
  :::

  :::u-accordion-item{label="Unexpected column" icon="i-tabler-column-insert-right"}
  The physical table contains a column that is absent from metadata.
  :::

  :::u-accordion-item{label="Type mismatch" icon="i-tabler-arrows-diff"}
  The declared metadata type differs from the SQL type mapped by the adapter.
  :::

  :::u-accordion-item{label="Nullability mismatch" icon="i-tabler-circle-half-2"}
  The declared `nullable` flag differs from `information_schema.columns.is_nullable`.
  :::

  :::u-accordion-item{label="Primary-key mismatch" icon="i-tabler-key-off"}
  The declared `primaryKey` flag differs from the discovered PostgreSQL primary-key constraint.
  :::
::

## Example output

```ts
[
  {
    table: 'users',
    issues: [
      'Colonne "email" : nullable déclaré "false" ≠ réel "true".',
      'Colonne "display_name" déclarée mais absente en base.'
    ]
  }
]
```

## What is not compared

The current checker does not compare:

- unique constraints;
- foreign keys or relations;
- database defaults;
- indexes;
- check constraints;
- schemas other than `public`;
- PostgreSQL-specific precision, scale, or length.

::u-callout
---
icon: i-tabler-alert-triangle
color: warning
variant: subtle
---
Because unique constraints are not introspected yet, `unique` cannot participate in drift detection. A clean result only covers tables, columns, mapped types, nullability, and primary keys.
::

## Operational use

Run consistency checks:

- during application startup in non-production environments;
- in a dedicated CI integration test against a migrated PostgreSQL database;
- as a deployment diagnostic after migrations;
- from an administration command that reports drift without mutating the schema.

The checker is read-only. It reports differences and never creates or alters database objects.
