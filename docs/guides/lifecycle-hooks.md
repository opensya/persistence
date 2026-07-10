# Lifecycle hooks

Lifecycle hooks execute application behavior around mutations.

## Creating a hooks registry

```ts
import {
  createHooksRegistry,
  createQueryEngine,
} from "@opensya/persistence";

const hooks = createHooksRegistry();
const engine = createQueryEngine(registry, adapter, hooks);
```

## Available hooks

| Hook | Input | Purpose |
| --- | --- | --- |
| `onBeforeCreate` | data and context | transform data before validation |
| `onAfterCreate` | created entity and context | run post-create behavior |
| `onBeforeUpdate` | patch and context | transform the update patch |
| `onAfterUpdate` | updated entity and context | run post-update behavior |
| `onBeforeDelete` | filter and context | authorize or prepare deletion |
| `onAfterDelete` | context | run post-delete behavior |

## Transforming data

Before-create and before-update hooks return the data passed to the next hook:

```ts
hooks.onBeforeCreate("users", async (data, context) => ({
  ...data,
  email: String(data.email).trim().toLowerCase(),
  createdBy: context.user
    ? (context.user as { id: string }).id
    : null,
}));
```

Hooks run in registration order.

## After hooks

```ts
hooks.onAfterCreate("users", async (entity, context) => {
  await writeAuditEntry({
    operation: context.operation,
    table: context.table,
    entityId: entity.id,
    requestId: context.requestId,
  });
});
```

After hooks execute inside the same adapter transaction as the database mutation. If an after hook throws, the transaction callback rejects and the adapter should roll back the operation.

Avoid slow external calls inside transactional hooks when possible. An outbox pattern is safer for emails, webhooks, and message brokers.

## Deletion hooks

```ts
hooks.onBeforeDelete("users", async (where, context) => {
  if (!canDeleteUsers(context.user)) {
    throw new Error("User deletion is not allowed.");
  }

  console.debug("Deleting with filter", where);
});
```

For `deleteOne()`, the engine loads the entity first and passes a primary-key filter to the before-delete hook. For `deleteMany()`, it passes the original filter.

The deleted entity is not included in the current after-delete context.

## Hook context

```ts
interface HookContext {
  table: string;
  operation: "create" | "update" | "delete";
  metadata: TableMetadata;
  adapter: DatabaseAdapter;
  requestId?: string;
  tenantId?: string;
  user?: unknown;
  [key: string]: unknown;
}
```

The adapter in the context is the transaction-scoped adapter. Use it when a hook must perform related database operations atomically.

## Example: transactional related insert

```ts
hooks.onAfterCreate("users", async (entity, context) => {
  await context.adapter.insert("profiles", {
    id: crypto.randomUUID(),
    userId: entity.id,
  });
});
```

Ensure the related table has been built by the adapter during startup.
