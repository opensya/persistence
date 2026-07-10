---
title: Metadata and registry
description: Declare the persistence model and validate its internal consistency.
navigation:
  icon: i-tabler-schema
---

Metadata describes the model consumed by every Persistence service.

## Table metadata

```ts
interface TableMetadata {
  name: string
  collectionName: string
  columns: ColumnMetadata[]
  relations: RelationMetadata[]
  tableValidators: TableValidatorMetadata[]
}
```

- `name` is the logical identifier used by the engine.
- `collectionName` is the physical database table name.
- `columns` describe fields and their constraints.
- `relations` describe direct links between registered tables.
- `tableValidators` express rules spanning several fields.

## Column metadata

```ts
interface ColumnMetadata {
  name: string
  columnName: string
  type: ColumnType
  nullable: boolean
  primaryKey: boolean
  unique: boolean
  default?: unknown | (() => unknown)
  validators: FieldValidatorMetadata[]
}
```

## Column types

| Type | Expected runtime value |
| --- | --- |
| `uuid`, `string`, `text`, `date` | string |
| `integer` | integer number |
| `bigint` | bigint |
| `boolean` | boolean |
| `timestamp` | Date |
| `json` | any value |
| `decimal` | string or number |

## Defaults

```ts
// Static
default: 'draft'

// Evaluated for each creation
default: () => crypto.randomUUID()
```

The Query Engine applies missing defaults before before-create hooks. The Drizzle adapter also maps defaults when building its runtime table.

## Registry lifecycle

::u-steps{level="3"}
### Create

```ts
const registry = createMetadataRegistry()
```

### Register all tables

```ts
registry.register(users)
registry.register(projects)
```

Registration rejects duplicate logical table names immediately.

### Validate

```ts
const errors = registry.validate()
```

Validation returns every discovered `RegistryValidationError` without changing registry state.

### Lock

```ts
registry.lock()
```

`lock()` validates and throws one aggregated schema error when necessary. A locked registry rejects further registrations.
::

## Registry invariants

The registry verifies:

- physical collection names are unique;
- logical and physical column names are unique within a table;
- every table has at least one primary key;
- relation names are unique within their source table;
- relation targets are registered;
- source and target fields exist;
- many-to-many junction tables and fields exist.

::u-callout
---
icon: i-tabler-list-check
color: info
variant: subtle
---
Register the full model before validating it. A relation target that has not been registered yet is reported as unknown.
::

## Relation metadata

::u-tabs
  :::u-tab{label="To one" icon="i-tabler-arrow-right"}
  `manyToOne` and `oneToOne` store `foreignKey` on the source and use `references ?? 'id'` on the target.
  :::

  :::u-tab{label="One to many" icon="i-tabler-git-branch"}
  `oneToMany` uses `references ?? 'id'` on the source and `foreignKey` on the target.
  :::

  :::u-tab{label="Many to many" icon="i-tabler-topology-star-3"}
  `manyToMany` declares a registered junction table with source and target foreign-key fields.
  :::
::

## Composite primary keys

Multiple columns may be primary keys. For single-row update and delete operations, the engine builds a filter containing every primary-key value from the loaded entity.

## Metadata and introspection

Declared metadata is richer than introspected metadata. PostgreSQL introspection reconstructs physical tables and columns but cannot currently reconstruct validators, relations, defaults, or unique constraints. This is expected; declared metadata remains the domain source of truth.
