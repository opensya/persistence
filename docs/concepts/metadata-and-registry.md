# Metadata and registry

Metadata is the shared schema understood by the query engine and database adapters.

## Table metadata

```ts
import type { TableMetadata } from "@opensya/persistence";

const projectsMetadata: TableMetadata = {
  name: "projects",
  collectionName: "projects",

  columns: [],
  relations: [],
  tableValidators: [],
};
```

## Column metadata

Each column declares both its application field and physical database column.

```ts
{
  name: "createdAt",
  columnName: "created_at",
  type: "timestamp",
  nullable: false,
  primaryKey: false,
  unique: false,
  default: () => new Date(),
  validators: [],
}
```

Supported column types are:

| Metadata type | Runtime value expected by validation | Drizzle PostgreSQL builder |
| --- | --- | --- |
| `uuid` | `string` | `uuid` |
| `string` | `string` | `text` |
| `text` | `string` | `text` |
| `integer` | integer `number` | `integer` |
| `bigint` | `bigint` | `bigint` |
| `boolean` | `boolean` | `boolean` |
| `timestamp` | `Date` | `timestamp` |
| `date` | `string` | `date` |
| `json` | any value | `json` |
| `decimal` | `string` or `number` | `numeric` |

A non-nullable field is required during creation unless a default supplies its value.

## Defaults

A default can be a value or a function:

```ts
default: "draft"
```

```ts
default: () => crypto.randomUUID()
```

Default functions are evaluated by the query engine during creation. The Drizzle adapter also maps defaults to Drizzle when building its runtime table.

## Registry lifecycle

```ts
import { createMetadataRegistry } from "@opensya/persistence";

const registry = createMetadataRegistry();

registry.register(usersMetadata);
registry.register(projectsMetadata);

const errors = registry.validate();

if (errors.length > 0) {
  console.error(errors);
}

registry.lock();
```

After `lock()`, further calls to `register()` throw an error.

## Registry validation

The registry checks:

- duplicate logical table names during registration;
- duplicate physical collection names;
- duplicate field names;
- duplicate physical column names;
- the presence of at least one primary key;
- duplicate relation names;
- relation targets;
- source, target, and junction fields.

Because relations may target tables registered later, register all metadata before calling `validate()` or `lock()`.

## Accessing metadata

```ts
registry.has("users");
registry.get("users");
registry.getOrThrow("users");
registry.getAll();
registry.isLocked();
```

Use `getOrThrow()` when an unknown table should be considered a programming error. The query engine uses this method before executing operations.

## Composite primary keys

The registry allows more than one column to be marked as a primary key. `updateOne()` and `deleteOne()` build a filter containing all primary-key fields after loading the target entity.
