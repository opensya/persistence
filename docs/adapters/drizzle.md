---
title: Drizzle adapter
description: Connect OpenSya Persistence to PostgreSQL through Drizzle ORM.
navigation:
  icon: i-tabler-brand-drizzle
---

The built-in `DrizzleAdapter` implements the database-independent adapter contract for PostgreSQL with Drizzle ORM.

## Installation

::u-tabs
  :::u-tab{label="pnpm" icon="i-tabler-package"}
  ```bash
  pnpm add @opensya/persistence drizzle-orm pg
  pnpm add -D @types/pg
  ```
  :::

  :::u-tab{label="Yarn" icon="i-tabler-package"}
  ```bash
  yarn add @opensya/persistence drizzle-orm pg
  yarn add -D @types/pg
  ```
  :::
::

::u-callout
---
icon: i-tabler-info-circle
color: info
variant: subtle
---
The package currently declares `drizzle-orm@1.0.0-beta.22` as a peer dependency.
::

## Create the adapter

```ts
import { createDrizzleAdapter } from '@opensya/persistence'

const adapter = createDrizzleAdapter(db)
```

The `db` argument must be an asynchronous Drizzle PostgreSQL database with transaction support.

## Build runtime tables

```ts
for (const table of registry.getAll()) {
  adapter.buildTable(table)
}
```

::u-callout
---
icon: i-tabler-database-exclamation
color: warning
variant: subtle
title: Build before querying
---
Every registered table must be built during startup. Otherwise, the adapter rejects queries for that table.
::

`buildTable()` creates runtime Drizzle objects. It does not execute DDL, create migrations, or synchronize PostgreSQL.

## Column mapping

| Metadata type | Drizzle PostgreSQL builder |
| --- | --- |
| `uuid` | `uuid` |
| `string`, `text` | `text` |
| `integer` | `integer` |
| `bigint` | `bigint({ mode: "bigint" })` |
| `boolean` | `boolean` |
| `timestamp` | `timestamp` |
| `date` | `date` |
| `json` | `json` |
| `decimal` | `numeric` |

## Constraint mapping

::u-page-grid
  ::u-page-card{title="Primary key" description="primaryKey maps to .primaryKey()." icon="i-tabler-key"}
  ::
  ::u-page-card{title="Required" description="nullable: false maps to .notNull()." icon="i-tabler-asterisk"}
  ::
  ::u-page-card{title="Unique" description="unique: true maps to .unique()." icon="i-tabler-number-1"}
  ::
  ::u-page-card{title="Defaults" description="Values use .default(); factories use .$defaultFn()." icon="i-tabler-wand"}
  ::
::

## Transactions

```ts
await adapter.transaction(async transactionAdapter => {
  await transactionAdapter.insert('users', user)
  await transactionAdapter.insert('profiles', profile)
})
```

The transaction-scoped adapter reuses the runtime table map built during startup.

## Direct adapter usage

```ts
const users = await adapter.findMany('users', {
  where: {
    conditions: [
      { field: 'active', operator: 'eq', value: true }
    ]
  }
})
```

::u-callout
---
icon: i-tabler-alert-triangle
color: warning
variant: subtle
title: Prefer the Query Engine
---
Direct adapter calls do not run metadata validators or lifecycle hooks. Use the Query Engine for application mutations.
::

The adapter still enforces:

::u-accordion
  :::u-accordion-item{label="Known fields" icon="i-tabler-columns"}
  Filters, ordering, inserts, and update patches must reference built fields.
  :::

  :::u-accordion-item{label="Valid pagination" icon="i-tabler-list-numbers"}
  Negative limits and offsets are rejected.
  :::

  :::u-accordion-item{label="Valid collection operators" icon="i-tabler-list-check"}
  `in` and `notIn` require non-empty array values.
  :::

  :::u-accordion-item{label="Safe mutations" icon="i-tabler-shield-check"}
  Direct update and delete operations also require a non-empty filter.
  :::
::

## Introspection

::u-callout
---
icon: i-tabler-tool
color: error
variant: subtle
title: Not implemented in version 0.0.1
---
`DrizzleAdapter.introspect()` currently throws `PostgreSQL introspection is not implemented yet.`
::

Consequently, `ConsistencyChecker.check()` cannot yet run with the built-in adapter.

## Custom adapters

Implement `DatabaseAdapter` to support another database or ORM:

```ts
import type {
  DatabaseAdapter,
  QueryFilter,
  QueryParams,
  TableMetadata
} from '@opensya/persistence'

export class CustomAdapter implements DatabaseAdapter {
  // Implement the complete adapter contract.
}
```

Custom adapters should provide real transactional semantics and preserve the built-in mutation safety guarantees.
