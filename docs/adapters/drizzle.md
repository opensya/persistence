# Drizzle adapter

The built-in `DrizzleAdapter` implements `DatabaseAdapter` for PostgreSQL using Drizzle ORM.

## Installation

```bash
pnpm add @opensya/persistence drizzle-orm pg
pnpm add -D @types/pg
```

The package currently declares `drizzle-orm@1.0.0-beta.22` as a peer dependency.

## Creating the adapter

```ts
import { createDrizzleAdapter } from "@opensya/persistence";

const adapter = createDrizzleAdapter(db);
```

The `db` argument must be a Drizzle PostgreSQL asynchronous database instance that supports transactions.

## Building runtime tables

The adapter builds Drizzle table objects from metadata:

```ts
for (const table of registry.getAll()) {
  adapter.buildTable(table);
}
```

This must happen before executing queries. Otherwise, the adapter throws:

```text
Table "<name>" has not been built. Call buildTable() during startup.
```

`buildTable()` does not execute DDL, generate a migration, or synchronize PostgreSQL. Database tables must already exist.

## Column mapping

| Metadata type | Drizzle PostgreSQL type |
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

The adapter also maps:

- `primaryKey` to `.primaryKey()`;
- `nullable: false` to `.notNull()`;
- `unique: true` to `.unique()`;
- static defaults to `.default()`;
- default functions to `.$defaultFn()`.

## Transactions

Mutation operations use:

```ts
adapter.transaction(async (transactionAdapter) => {
  // All operations use the same Drizzle transaction.
});
```

The transaction adapter shares the runtime table map created during startup.

## Direct adapter usage

Although application code should normally use `QueryEngine`, the adapter can be called directly:

```ts
const users = await adapter.findMany("users", {
  where: {
    conditions: [
      { field: "active", operator: "eq", value: true },
    ],
  },
});
```

Direct adapter calls do not execute metadata validators or lifecycle hooks.

The adapter still checks:

- query field names;
- insert and update field names;
- negative limits and offsets;
- non-empty arrays for `in` and `notIn`;
- non-empty filters for update and delete operations.

## Introspection

`DrizzleAdapter.introspect()` currently throws:

```text
PostgreSQL introspection is not implemented yet.
```

As a result, `ConsistencyChecker.check()` cannot yet be used with the built-in adapter. This limitation should be resolved by a future PostgreSQL introspection implementation.

## Custom adapters

Implement `DatabaseAdapter` to support another database or ORM:

```ts
import type {
  DatabaseAdapter,
  QueryFilter,
  QueryParams,
  TableMetadata,
} from "@opensya/persistence";

export class CustomAdapter implements DatabaseAdapter {
  // Implement the complete adapter contract.
}
```

Custom adapters should match the built-in safety behavior and provide real transactional semantics.
