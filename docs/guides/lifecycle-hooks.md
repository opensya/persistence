---
title: Lifecycle hooks
description: Run ordered domain behavior around transactional mutations.
navigation:
  icon: i-tabler-arrows-split
---

Hooks are registered per logical table name and mutation phase.

## Register hooks

```ts
const hooks = createHooksRegistry()

hooks.onBeforeCreate('users', normalizeEmail)
hooks.onAfterCreate('users', createProfile)

const engine = createQueryEngine(registry, adapter, hooks)
```

## Before hooks

Before-create and before-update hooks transform data. The result of one hook becomes the input of the next.

```ts
hooks.onBeforeCreate('users', async (data, context) => ({
  ...data,
  email: String(data.email).trim().toLowerCase(),
  createdBy: (context.user as { id?: string } | undefined)?.id
}))
```

Before-delete hooks receive the effective `QueryFilter` and return no transformed value.

```ts
hooks.onBeforeDelete('users', async (where, context) => {
  if (!canDeleteUsers(context.user)) {
    throw new Error('Deletion is not allowed.')
  }
})
```

## After hooks

After-create and after-update hooks receive the entity returned by the adapter.

```ts
hooks.onAfterUpdate('users', async (entity, context) => {
  await context.adapter.insert('auditEntries', {
    id: crypto.randomUUID(),
    entityId: entity.id,
    operation: context.operation
  })
})
```

After-delete hooks receive context only.

## Hook context

```ts
interface HookContext {
  table: string
  operation: 'create' | 'update' | 'delete'
  metadata: TableMetadata
  adapter: DatabaseAdapter
  requestId?: string
  tenantId?: string
  user?: unknown
  [key: string]: unknown
}
```

The adapter is bound to the active transaction, so related database work performed by a hook remains atomic.

## Per-operation behavior

| Operation | Before input | After input |
| --- | --- | --- |
| create | resolved creation data | inserted entity |
| updateOne | patch | updated entity |
| updateMany | one shared patch | hook runs for each updated entity |
| deleteOne | primary-key filter of loaded entity | context |
| deleteMany | original filter | context |

## Failure semantics

Hooks run sequentially. If a before or after hook throws, the adapter transaction callback rejects and Drizzle rolls the transaction back.

::u-callout
---
icon: i-tabler-clock-exclamation
color: warning
variant: subtle
---
Do not perform slow, non-transactional external calls directly inside hooks. Write an outbox record transactionally, then deliver emails, webhooks, or messages asynchronously.
::

## Good uses

- normalization and derived fields;
- authorization checks that require mutation context;
- tenant field injection;
- audit or outbox inserts;
- maintaining related records atomically;
- rejecting invalid domain transitions.

Hooks complement validators. Use validators for data validity and hooks for mutation behavior.
