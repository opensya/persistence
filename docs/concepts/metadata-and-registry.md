---
title: Metadata and registry
description: Declare tables, columns, defaults, validators, and relations through a shared metadata model.
navigation:
  icon: i-tabler-schema
---

Metadata is the source of truth shared by the Query Engine, relation resolver, registry, and database adapters.

## Table metadata

```ts [projects.metadata.ts]
import type { TableMetadata } from '@opensya/persistence'

export const projectsMetadata: TableMetadata = {
  name: 'projects',
  collectionName: 'projects',
  columns: [],
  relations: [],
  tableValidators: []
}
```

::u-page-grid
  ::u-page-card{title="name" description="Logical identifier used by the Query Engine." icon="i-tabler-tag"}
  ::
  ::u-page-card{title="collectionName" description="Physical table or collection name." icon="i-tabler-database"}
  ::
  ::u-page-card{title="columns" description="Fields, types, constraints, defaults, and validators." icon="i-tabler-columns"}
  ::
  ::u-page-card{title="relations" description="Links to other registered tables." icon="i-tabler-link"}
  ::
::

## Column metadata

```ts
{
  name: 'createdAt',
  columnName: 'created_at',
  type: 'timestamp',
  nullable: false,
  primaryKey: false,
  unique: false,
  default: () => new Date(),
  validators: []
}
```

## Supported types

| Metadata type | Expected JavaScript value | Drizzle PostgreSQL builder |
| --- | --- | --- |
| `uuid` | `string` | `uuid` |
| `string` | `string` | `text` |
| `text` | `string` | `text` |
| `integer` | integer `number` | `integer` |
| `bigint` | `bigint` | `bigint` |
| `boolean` | `boolean` | `boolean` |
| `timestamp` | `Date` | `timestamp` |
| `date` | `string` | `date` |
| `json` | any value | `json` |
| `decimal` | `string` or `number` | `numeric` |

::u-callout
---
icon: i-tabler-alert-triangle
color: warning
variant: subtle
---
A non-nullable field is required during creation unless a metadata default supplies its value.
::

## Defaults

::u-tabs
  :::u-tab{label="Static value" icon="i-tabler-equal"}
  ```ts
  default: 'draft'
  ```
  :::

  :::u-tab{label="Factory function" icon="i-tabler-function"}
  ```ts
  default: () => crypto.randomUUID()
  ```
  :::
::

Default functions are evaluated during creation. The Drizzle adapter also maps them when it builds runtime tables.

## Registry lifecycle

::u-steps{level="3"}
### Create a registry

```ts
const registry = createMetadataRegistry()
```

### Register every table

```ts
registry.register(usersMetadata)
registry.register(projectsMetadata)
```

### Inspect validation errors when needed

```ts
const errors = registry.validate()
```

### Lock the schema

```ts
registry.lock()
```
::

After `lock()`, any new `register()` call throws an error.

## What the registry validates

::u-accordion
  :::u-accordion-item{label="Table identity" icon="i-tabler-table"}
  Duplicate logical table names are rejected during registration, while duplicate physical collection names are reported during validation.
  :::

  :::u-accordion-item{label="Columns" icon="i-tabler-columns"}
  The registry checks duplicate logical fields, duplicate physical column names, and the presence of at least one primary key.
  :::

  :::u-accordion-item{label="Relations" icon="i-tabler-link"}
  Relation names, target tables, source fields, target fields, junction tables, and junction fields are verified.
  :::
::

::u-callout
---
icon: i-tabler-list-check
color: primary
variant: subtle
title: Registration order
---
Relations may point to tables registered later. Register the complete schema before calling `validate()` or `lock()`.
::

## Registry API

```ts
registry.has('users')
registry.get('users')
registry.getOrThrow('users')
registry.getAll()
registry.isLocked()
```

## Composite primary keys

More than one column may be marked as a primary key. For `updateOne()` and `deleteOne()`, the Query Engine loads the target and builds a filter containing every primary-key field.
