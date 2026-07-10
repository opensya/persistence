# Query engine

The `QueryEngine` is the main API used by application services.

## Creation

```ts
import { createQueryEngine } from "@opensya/persistence";

const engine = createQueryEngine(registry, adapter, hooks);
```

The hooks registry is optional. When omitted, the engine creates an empty `HooksRegistry`.

## Read operations

```ts
engine.findMany<T>(tableName, params);
engine.findOne<T>(tableName, params);
```

Read parameters support:

- `where`;
- `orderBy`;
- `limit`;
- `offset`;
- `populate`.

Reads do not run lifecycle hooks and are not automatically wrapped in a transaction.

## Mutation operations

```ts
engine.create<T>(tableName, data, context);
engine.updateOne<T>(tableName, where, patch, context);
engine.updateMany<T>(tableName, where, patch, context);
engine.deleteOne(tableName, where, context);
engine.deleteMany(tableName, where, context);
```

All mutations run inside `adapter.transaction()`.

## Return values

| Operation | Result |
| --- | --- |
| `create` | created entity |
| `updateOne` | updated entity or `null` |
| `updateMany` | updated entities |
| `deleteOne` | `true` when a row was deleted |
| `deleteMany` | number of deleted rows |
| `findOne` | entity or `null` |
| `findMany` | entity array |

## Query context

Mutation methods accept an optional context:

```ts
await engine.create(
  "projects",
  { name: "OpenSya" },
  {
    requestId: request.id,
    tenantId: tenant.id,
    user: currentUser,
  },
);
```

The context is forwarded to lifecycle hooks. It supports the standard `requestId`, `tenantId`, and `user` properties as well as custom properties.

Passing `tenantId` does not automatically filter or populate a tenant column. Multi-tenancy enforcement must currently be implemented in application code or hooks.

## Type parameters

The generic type controls the returned TypeScript type:

```ts
interface User {
  id: string;
  email: string;
}

const user = await engine.findOne<User>("users", {
  where: {
    conditions: [{ field: "id", operator: "eq", value: userId }],
  },
});
```

This is a return-type assertion, not schema inference. The engine does not currently derive entity types from metadata.
