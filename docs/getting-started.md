---
title: Getting started
description: Install OpenSya Persistence and execute your first metadata-driven query.
navigation:
  icon: i-tabler-rocket
---

::u-callout
---
icon: i-tabler-info-circle
color: info
variant: subtle
title: Version compatibility
---
OpenSya Persistence is currently at version `0.0.1` and declares `drizzle-orm@1.0.0-beta.22` as a peer dependency.
::

## Requirements

::u-page-grid
  ::u-page-card
  ---
  icon: i-tabler-brand-nodejs
  title: Node.js
  description: A modern Node.js runtime with ESM support.
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  icon: i-tabler-brand-typescript
  title: TypeScript
  description: A TypeScript project configured for modern ES modules.
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  icon: i-tabler-brand-postgresql
  title: PostgreSQL
  description: A PostgreSQL database connected through Drizzle ORM.
  spotlight: true
  ---
  ::
::

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

## Initialize Persistence

::u-steps{level="3"}

### Declare table metadata

Persistence consumes metadata rather than a Drizzle table definition.

```ts [users.metadata.ts]
import type { TableMetadata } from '@opensya/persistence'

export const usersMetadata: TableMetadata = {
  name: 'users',
  collectionName: 'users',

  columns: [
    {
      name: 'id',
      columnName: 'id',
      type: 'uuid',
      nullable: false,
      primaryKey: true,
      unique: true,
      default: () => crypto.randomUUID(),
      validators: []
    },
    {
      name: 'email',
      columnName: 'email',
      type: 'string',
      nullable: false,
      primaryKey: false,
      unique: true,
      validators: [
        {
          name: 'valid-email',
          validate: value =>
            typeof value === 'string' && value.includes('@')
              ? { valid: true }
              : { valid: false, message: 'A valid email is required.' }
        }
      ]
    }
  ],

  relations: [],
  tableValidators: []
}
```

::u-callout
---
icon: i-tabler-key
color: warning
variant: subtle
---
Every registered table must declare at least one primary key.
::

### Create and lock the registry

```ts [persistence.ts]
import { createMetadataRegistry } from '@opensya/persistence'
import { usersMetadata } from './users.metadata.js'

const registry = createMetadataRegistry()

registry.register(usersMetadata)
registry.lock()
```

Register every table before calling `lock()`. Once locked, the registry rejects new metadata.

### Create the Drizzle adapter

Assuming `db` is an initialized Drizzle PostgreSQL database:

```ts [persistence.ts]
import { createDrizzleAdapter } from '@opensya/persistence'

const adapter = createDrizzleAdapter(db)

for (const table of registry.getAll()) {
  adapter.buildTable(table)
}
```

::u-callout
---
icon: i-tabler-database-exclamation
color: warning
variant: subtle
title: Runtime tables only
---
`buildTable()` creates the Drizzle objects used at runtime. It does not create PostgreSQL tables or run migrations.
::

### Create the Query Engine

```ts [persistence.ts]
import { createQueryEngine } from '@opensya/persistence'

const engine = createQueryEngine(registry, adapter)
```

### Execute your first operations

```ts [example.ts]
const user = await engine.create('users', {
  email: 'john@example.com'
})

const users = await engine.findMany('users', {
  where: {
    conditions: [
      {
        field: 'email',
        operator: 'eq',
        value: 'john@example.com'
      }
    ]
  }
})

await engine.updateOne(
  'users',
  {
    conditions: [
      { field: 'id', operator: 'eq', value: user.id }
    ]
  },
  {
    email: 'new-email@example.com'
  }
)

await engine.deleteOne('users', {
  conditions: [
    { field: 'id', operator: 'eq', value: user.id }
  ]
})
```
::

## Reusable application factory

::u-collapsible
#default
  ::u-button
  ---
  label: Show the complete factory
  color: neutral
  variant: subtle
  trailing-icon: i-tabler-chevron-down
  ---
  ::

#content
```ts [create-persistence.ts]
import {
  createDrizzleAdapter,
  createHooksRegistry,
  createMetadataRegistry,
  createQueryEngine,
  type TableMetadata
} from '@opensya/persistence'

export function createPersistence(
  db: Parameters<typeof createDrizzleAdapter>[0],
  tables: TableMetadata[]
) {
  const registry = createMetadataRegistry()

  for (const table of tables) {
    registry.register(table)
  }

  registry.lock()

  const adapter = createDrizzleAdapter(db)

  for (const table of registry.getAll()) {
    adapter.buildTable(table)
  }

  const hooks = createHooksRegistry()
  const engine = createQueryEngine(registry, adapter, hooks)

  return { registry, adapter, hooks, engine }
}
```
::

## Continue learning

::u-page-grid
  ::u-page-card
  ---
  title: Architecture
  description: Understand the runtime layers and mutation pipeline.
  icon: i-tabler-sitemap
  to: /concepts/architecture
  ---
  ::

  ::u-page-card
  ---
  title: Queries and filters
  description: Build filters, ordering, pagination, and safe mutations.
  icon: i-tabler-filter
  to: /guides/queries-and-filters
  ---
  ::

  ::u-page-card
  ---
  title: Validation
  description: Add structural, field, and cross-field rules.
  icon: i-tabler-checkup-list
  to: /guides/validation
  ---
  ::
::
