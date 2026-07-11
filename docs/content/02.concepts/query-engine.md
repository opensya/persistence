---
title: Query Engine
description: Execute typed reads, safe mutations and application transactions.
navigation:
  icon: i-tabler-engine
---

`QueryEngine` is the application-facing runtime. It coordinates the registry,
adapter, validators, hooks, serializer, audit manager and domain-event outbox.

## Reads

```ts
const users = await engine.findMany('users', {
  where,
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 20,
  populate: ['teams'],
  context: { user: actor }
})

const user = await engine.findOne('users', { where: byId(userId) })
```

Results are inferred from registered metadata and serialized before returning.
Reads do not execute lifecycle hooks.

## Mutations

```ts
const created = await engine.create('users', input, context)
const updated = await engine.updateOne('users', byId(id), patch, context)
const rows = await engine.updateMany('users', activeUsers, patch, context)
const removed = await engine.deleteOne('users', byId(id), context)
const count = await engine.deleteMany('sessions', expiredSessions, context)
```

Every mutation runs inside `adapter.transaction()`.

| Method | Inferred return |
| --- | --- |
| `findMany('users')` | `User[]` |
| `findOne('users')` | `User \| null` |
| `findPage('users')` | `CursorPage<User>` |
| `create('users')` | `User` |
| `updateOne('users')` | `User \| null` |
| `updateMany('users')` | `User[]` |
| `deleteOne` | `boolean` |
| `deleteMany` | `number` |

## Mutation pipeline

::steps{level="3"}
### Resolve metadata and defaults
### Run ordered before hooks
### Reject unknown fields
### Validate the resulting entity
### Execute through the transaction adapter
### Run after hooks
### Record audit entries when enabled
### Serialize the returned entity
::

Updates and deletes require a filter containing at least one effective
condition. Empty nested filters are rejected with `UnsafeMutationError`.

## Application transaction

Use `transaction()` when several domain mutations and emitted events must commit
as one unit.

```ts
await engine.transaction(context, async tx => {
  const application = await tx.updateOne(
    'applications',
    byId(applicationId),
    { status: 'hired' }
  )

  tx.events.emit('candidate.hired', {
    applicationId: application!.id,
    candidateId: application!.candidateId
  })
})
```

Events are collected and persisted only after the callback succeeds, but still
inside the same outer transaction.

## Context

```ts
interface QueryContextInput {
  requestId?: string
  tenantId?: string
  user?: unknown
  [key: string]: unknown
}
```

Context feeds hooks, visibility rules, audit metadata and domain events. It does
not enforce authorization or tenant isolation by itself.
