---
title: Getting started
description: Build a minimal OpenSya Persistence runtime with PostgreSQL and Drizzle.
navigation:
  icon: i-tabler-rocket
---

This guide creates one metadata table, initializes the runtime, performs a mutation, and verifies the live PostgreSQL schema.

## Prerequisites

- a TypeScript application using ES modules;
- a PostgreSQL database;
- an initialized Drizzle `PgAsyncDatabase`;
- physical database tables created through your migration workflow.

::u-callout
---
icon: i-tabler-package
color: info
variant: subtle
---
Version `0.0.1` declares `drizzle-orm@1.0.0-beta.22` as a peer dependency.
::

## Install

```bash [Terminal]
pnpm add @opensya/persistence drizzle-orm pg
pnpm add -D @types/pg
```

## Initialize the runtime

::u-steps{level="3"}

### Declare metadata

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
          name: 'email-format',
          validate(value) {
            return typeof value === 'string' && value.includes('@')
              ? { valid: true }
              : { valid: false, message: 'Enter a valid email address.' }
          }
        }
      ]
    },
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
  ],
  relations: [],
  tableValidators: []
}
```

Every table needs at least one primary key. Logical names such as `createdAt` are used by the Query Engine; physical names such as `created_at` are used in PostgreSQL.

### Register and lock the schema

```ts [persistence.ts]
import { createMetadataRegistry } from '@opensya/persistence'
import { usersMetadata } from './users.metadata.js'

const registry = createMetadataRegistry()

registry.register(usersMetadata)
registry.lock()
```

`lock()` validates the complete registry. Register every table before calling it because relations may target metadata declared elsewhere.

### Create the adapter

```ts [persistence.ts]
import { createDrizzleAdapter } from '@opensya/persistence'

const adapter = createDrizzleAdapter(db)

for (const table of registry.getAll()) {
  adapter.buildTable(table)
}
```

`buildTable()` creates the Drizzle table objects used by runtime queries. It does not create or alter PostgreSQL tables.

### Create the Query Engine

```ts [persistence.ts]
import {
  createHooksRegistry,
  createQueryEngine
} from '@opensya/persistence'

const hooks = createHooksRegistry()
const engine = createQueryEngine(registry, adapter, hooks)
```

### Execute operations

```ts [users.service.ts]
interface User {
  id: string
  email: string
  createdAt: Date
}

const user = await engine.create<User>('users', {
  email: 'john@example.com'
})

const saved = await engine.findOne<User>('users', {
  where: {
    conditions: [
      { field: 'id', operator: 'eq', value: user.id }
    ]
  }
})
```

### Compare metadata with PostgreSQL

```ts [schema-check.ts]
import { createConsistencyChecker } from '@opensya/persistence'

const checker = createConsistencyChecker(registry, adapter)
const drift = await checker.check()

if (drift.length > 0) {
  console.error(drift)
}
```

The Drizzle adapter introspects base tables in PostgreSQL's `public` schema. See [Schema consistency](/guides/schema-consistency) for the exact comparison rules and current introspection limits.
::

## Complete factory

```ts [create-persistence.ts]
import {
  createConsistencyChecker,
  createDrizzleAdapter,
  createHooksRegistry,
  createMetadataRegistry,
  createQueryEngine,
  type TableMetadata
} from '@opensya/persistence'

export function createPersistence(
  db: Parameters<typeof createDrizzleAdapter>[0],
  tables: readonly TableMetadata[]
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
  const consistency = createConsistencyChecker(registry, adapter)

  return { registry, adapter, hooks, engine, consistency }
}
```

## Next

::u-page-grid
  ::u-page-card{title="Metadata and registry" description="Learn every metadata field and registry invariant." icon="i-tabler-schema" to="/concepts/metadata-and-registry"}
  ::
  ::u-page-card{title="Query Engine" description="Understand read and mutation semantics." icon="i-tabler-engine" to="/concepts/query-engine"}
  ::
  ::u-page-card{title="Drizzle adapter" description="Review SQL translation and introspection." icon="i-tabler-database-cog" to="/adapters/drizzle"}
  ::
::
