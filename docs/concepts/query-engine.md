---
title: Query Engine
description: Read and mutate entities through one validated, transactional API.
navigation:
  icon: i-tabler-engine
---

Create an engine from a locked registry, an adapter with built runtime tables, and an optional hooks registry.

```ts
const engine = createQueryEngine(registry, adapter, hooks)
```

## Reads

```ts
const users = await engine.findMany<User>('users', {
  where,
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 20,
  offset: 0,
  populate: ['projects']
})

const user = await engine.findOne<User>('users', {
  where: byId(userId)
})
```

`findOne()` delegates to the adapter with `limit: 1`. Population happens after the base query.

## Create

```ts
const user = await engine.create<User>(
  'users',
  { email: 'john@example.com' },
  { requestId, tenantId, user: actor }
)
```

::u-steps{level="3"}
### Apply missing metadata defaults
### Run before-create hooks in order
### Reject unknown fields
### Run structural, field, and table validation
### Insert with the transaction adapter
### Run after-create hooks
::

## Update one

```ts
const updated = await engine.updateOne<User>(
  'users',
  byId(userId),
  { email: 'new@example.com' },
  context
)
```

The engine loads one current entity, transforms the patch through hooks, merges it for validation, then targets the write through the entity's complete primary key. It returns `null` when no row matches.

## Update many

```ts
const updated = await engine.updateMany<User>(
  'users',
  {
    conditions: [
      { field: 'status', operator: 'eq', value: 'pending' }
    ]
  },
  { status: 'active' }
)
```

Every matched entity is validated after merging the resolved patch. After-update hooks run once for every returned updated row.

## Delete

```ts
const removed = await engine.deleteOne('users', byId(userId))
const count = await engine.deleteMany('sessions', expiredSessions)
```

`deleteOne()` first resolves the target, then deletes through its primary key. `deleteMany()` passes the supplied filter directly to the adapter.

## Safe targeting

All update and delete methods reject filters without effective constraints.

```ts
await engine.deleteMany('users', {})
// UnsafeMutationError
```

A nested filter is only considered effective when it eventually contains at least one condition.

## Mutation context

```ts
interface QueryContextInput {
  requestId?: string
  tenantId?: string
  user?: unknown
  [key: string]: unknown
}
```

Context is forwarded to hooks together with the table metadata and transaction adapter.

::u-callout
---
icon: i-tabler-shield-exclamation
color: warning
variant: subtle
---
Context does not enforce authorization or tenant isolation automatically. It is input for your policies and hooks.
::

## Return values

| Method | Return |
| --- | --- |
| `findMany<T>` | `T[]` |
| `findOne<T>` | `T | null` |
| `create<T>` | `T` |
| `updateOne<T>` | `T | null` |
| `updateMany<T>` | `T[]` |
| `deleteOne` | `boolean` |
| `deleteMany` | `number` |

The generic type is caller-provided. The current API does not infer entity types from metadata.
