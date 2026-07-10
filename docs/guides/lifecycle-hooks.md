---
title: Lifecycle hooks
description: Transform data and execute behavior around transactional mutations.
navigation:
  icon: i-tabler-arrows-split
---

Lifecycle hooks execute application behavior before and after create, update, and delete operations.

## Create a hooks registry

```ts
import {
  createHooksRegistry,
  createQueryEngine
} from '@opensya/persistence'

const hooks = createHooksRegistry()
const engine = createQueryEngine(registry, adapter, hooks)
```

## Available hooks

::u-page-grid
  ::u-page-card{title="Before create" description="Transform incoming creation data before validation." icon="i-tabler-file-plus"}
  ::
  ::u-page-card{title="After create" description="React to the entity produced by the insert." icon="i-tabler-circle-check"}
  ::
  ::u-page-card{title="Before update" description="Normalize, enrich, authorize, or reject a patch." icon="i-tabler-edit"}
  ::
  ::u-page-card{title="After update" description="React to each updated entity." icon="i-tabler-file-check"}
  ::
  ::u-page-card{title="Before delete" description="Authorize or prepare a deletion." icon="i-tabler-trash-x"}
  ::
  ::u-page-card{title="After delete" description="Run behavior after the adapter deletion." icon="i-tabler-trash-check"}
  ::
::

## Transform data

Before-create and before-update hooks return the value passed to the next hook:

```ts
hooks.onBeforeCreate('users', async (data, context) => ({
  ...data,
  email: String(data.email).trim().toLowerCase(),
  createdBy: context.user
    ? (context.user as { id: string }).id
    : null
}))
```

::u-callout
---
icon: i-tabler-sort-ascending
color: info
variant: subtle
---
Hooks run sequentially in registration order.
::

## After hooks

```ts
hooks.onAfterCreate('users', async (entity, context) => {
  await writeAuditEntry({
    operation: context.operation,
    table: context.table,
    entityId: entity.id,
    requestId: context.requestId
  })
})
```

After hooks run inside the same transaction as the mutation. Throwing from an after hook rejects the transaction callback.

::u-callout
---
icon: i-tabler-clock-exclamation
color: warning
variant: subtle
title: Keep transactions short
---
Avoid slow external calls inside hooks. Prefer a transactional outbox for emails, webhooks, and message brokers.
::

## Deletion hooks

```ts
hooks.onBeforeDelete('users', async (where, context) => {
  if (!canDeleteUsers(context.user)) {
    throw new Error('User deletion is not allowed.')
  }

  console.debug('Deleting with filter', where)
})
```

::u-tabs
  :::u-tab{label="deleteOne" icon="i-tabler-trash"}
  The engine loads the target first and passes a primary-key filter to the before-delete hook.
  :::

  :::u-tab{label="deleteMany" icon="i-tabler-trash-filled"}
  The engine passes the original mutation filter to the before-delete hook.
  :::
::

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

The context adapter is transaction-scoped.

## Transactional related operations

```ts
hooks.onAfterCreate('users', async (entity, context) => {
  await context.adapter.insert('profiles', {
    id: crypto.randomUUID(),
    userId: entity.id
  })
})
```

::u-callout
---
icon: i-tabler-database-check
color: success
variant: subtle
---
Related tables must be registered and built by the adapter during startup.
::

## Execution order

::u-steps{level="3"}
### Start the adapter transaction
### Build the hook context
### Execute before hooks
### Validate the resolved data
### Execute the database mutation
### Execute after hooks
### Commit or roll back
::
