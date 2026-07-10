# Getting started

This guide creates a minimal persistence runtime using the built-in Drizzle adapter.

## Requirements

- Node.js with ESM support
- TypeScript
- PostgreSQL
- Drizzle ORM `1.0.0-beta.22`
- an initialized Drizzle PostgreSQL database instance

## Installation

```bash
pnpm add @opensya/persistence drizzle-orm
pnpm add pg
pnpm add -D @types/pg
```

`drizzle-orm` is a peer dependency. The package currently targets version `1.0.0-beta.22`.

## 1. Declare metadata

Persistence consumes metadata rather than a Drizzle table definition.

```ts
import type { TableMetadata } from "@opensya/persistence";

export const usersMetadata: TableMetadata = {
  name: "users",
  collectionName: "users",

  columns: [
    {
      name: "id",
      columnName: "id",
      type: "uuid",
      nullable: false,
      primaryKey: true,
      unique: true,
      default: () => crypto.randomUUID(),
      validators: [],
    },
    {
      name: "email",
      columnName: "email",
      type: "string",
      nullable: false,
      primaryKey: false,
      unique: true,
      validators: [
        {
          name: "email",
          validate: (value) =>
            typeof value === "string" && value.includes("@")
              ? { valid: true }
              : { valid: false, message: "A valid email is required." },
        },
      ],
    },
  ],

  relations: [],
  tableValidators: [],
};
```

Every table must have at least one primary key.

## 2. Create and lock the registry

```ts
import { createMetadataRegistry } from "@opensya/persistence";
import { usersMetadata } from "./users.metadata.js";

const registry = createMetadataRegistry();

registry.register(usersMetadata);
registry.lock();
```

Call `lock()` after registering every table. It validates table names, columns, primary keys, and relation references. A locked registry cannot accept new tables.

## 3. Create the adapter

Assuming `db` is an initialized Drizzle PostgreSQL database:

```ts
import { createDrizzleAdapter } from "@opensya/persistence";

const adapter = createDrizzleAdapter(db);
```

Build every registered table during startup:

```ts
for (const table of registry.getAll()) {
  adapter.buildTable(table);
}
```

`buildTable()` creates the Drizzle runtime representation used by the adapter. It does not create or migrate tables in PostgreSQL.

## 4. Create the query engine

```ts
import { createQueryEngine } from "@opensya/persistence";

const engine = createQueryEngine(registry, adapter);
```

## 5. Execute operations

```ts
const user = await engine.create("users", {
  email: "john@example.com",
});

const users = await engine.findMany("users", {
  where: {
    conditions: [
      {
        field: "email",
        operator: "eq",
        value: "john@example.com",
      },
    ],
  },
});

const updated = await engine.updateOne(
  "users",
  {
    conditions: [{ field: "id", operator: "eq", value: user.id }],
  },
  {
    email: "new-email@example.com",
  },
);

const deleted = await engine.deleteOne("users", {
  conditions: [{ field: "id", operator: "eq", value: user.id }],
});
```

## Runtime setup helper

A small application-level factory keeps initialization in one place:

```ts
import {
  createDrizzleAdapter,
  createHooksRegistry,
  createMetadataRegistry,
  createQueryEngine,
  type TableMetadata,
} from "@opensya/persistence";

export function createPersistence(
  db: Parameters<typeof createDrizzleAdapter>[0],
  tables: TableMetadata[],
) {
  const registry = createMetadataRegistry();

  for (const table of tables) {
    registry.register(table);
  }

  registry.lock();

  const adapter = createDrizzleAdapter(db);

  for (const table of registry.getAll()) {
    adapter.buildTable(table);
  }

  const hooks = createHooksRegistry();
  const engine = createQueryEngine(registry, adapter, hooks);

  return { registry, adapter, hooks, engine };
}
```

## Next steps

- Understand the [architecture](./concepts/architecture.md).
- Learn how to declare [metadata and registries](./concepts/metadata-and-registry.md).
- Explore [queries and filters](./guides/queries-and-filters.md).
- Add [validation](./guides/validation.md) and [lifecycle hooks](./guides/lifecycle-hooks.md).
