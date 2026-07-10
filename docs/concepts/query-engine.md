---
title: Query Engine
description: Use the application-facing API for reads, relation population, and transactional mutations.
navigation:
  icon: i-tabler-engine
---

The `QueryEngine` is the main API consumed by application services.

## Creation

```ts
import { createQueryEngine } from '@opensya/persistence'

const engine = createQueryEngine(registry, adapter, hooks)
```

::u-callout
---
icon: i-tabler-info-circle
color: info
variant: subtle
---
The hooks registry is optional. When omitted, the engine creates an empty `HooksRegistry`.
::

## Operations

::u-tabs
  :::u-tab{label="Read" icon="i-tabler-search"}
  ```ts
  engine.findMany<T>(tableName, params)
  engine.findOne<T>(tableName, params)
  ```

  Read parameters support `where`, `orderBy`, `limit`, `offset`, and `populate`. Reads do not run lifecycle hooks and are not automatically wrapped in a transaction.
  :::

  :::u-tab{label="Create" icon="i-tabler-plus"}
  ```ts
  engine.create<T>(tableName, data, context)
  ```

  Creation applies defaults, runs hooks, validates the complete entity, and inserts it transactionally.
  :::

  :::u-tab{label="Update" icon="i-tabler-edit"}
  ```ts
  engine.updateOne<T>(tableName, where, patch, context)
  engine.updateMany<T>(tableName, where, patch, context)
  ```

  Updates load existing data, merge the patch for validation, and reject empty filters.
  :::

  :::u-tab{label="Delete" icon="i-tabler-trash"}
  ```ts
  engine.deleteOne(tableName, where, context)
  engine.deleteMany(tableName, where, context)
  ```

  Deletes run hooks and reject empty filters before reaching the adapter.
  :::
::

## Return values

| Operation | Result |
| --- | --- |
| `create` | Created entity |
| `findOne` | Entity or `null` |
| `findMany` | Entity array |
| `updateOne` | Updated entity or `null` |
| `updateMany` | Updated entity array |
| `deleteOne` | `true` if a row was deleted |
| `deleteMany` | Number of deleted rows |

## Query context

Mutation methods accept an optional context forwarded to lifecycle hooks:

```ts
await engine.create(
  'projects',
  { name: 'OpenSya' },
  {
    requestId: request.id,
    tenantId: tenant.id,
    user: currentUser,
    source: 'api'
  }
)
```

::u-page-grid
  ::u-page-card{title="requestId" description="Correlate mutations with application requests." icon="i-tabler-fingerprint"}
  ::
  ::u-page-card{title="tenantId" description="Expose the current tenant to lifecycle hooks." icon="i-tabler-building"}
  ::
  ::u-page-card{title="user" description="Expose the current actor to domain rules." icon="i-tabler-user"}
  ::
  ::u-page-card{title="Custom fields" description="Carry additional application-specific context." icon="i-tabler-braces"}
  ::
::

::u-callout
---
icon: i-tabler-shield-exclamation
color: warning
variant: subtle
title: Context is not enforcement
---
Passing `tenantId` or `user` does not automatically enforce tenant isolation or authorization. Implement these rules in services, hooks, policies, or the database.
::

## Return typing

```ts
interface User {
  id: string
  email: string
}

const user = await engine.findOne<User>('users', {
  where: {
    conditions: [
      { field: 'id', operator: 'eq', value: userId }
    ]
  }
})
```

::u-callout
---
icon: i-tabler-code
color: neutral
variant: subtle
---
The generic controls the returned TypeScript type. It is currently a type assertion rather than metadata-driven inference.
::
