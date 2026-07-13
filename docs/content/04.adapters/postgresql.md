---
title: PostgreSQL adapter
description: PostgreSQL query execution, schema creation, transactions, and introspection.
navigation:
  icon: i-simple-icons-postgresql
---

`PostgreAdapter` implements `DatabaseAdapter` for Drizzle's asynchronous PostgreSQL database.

## Create an adapter

```ts
import { createPostgreAdapter } from '@opensya/persistence'

const adapter = createPostgreAdapter(db)
```

The database must support Drizzle's select, insert, update, delete, execute, and transaction APIs.

## Schema creation

```ts
const engine = createQueryEngine({ registry, adapter })
const result = await engine.schema.createTables()
```

The adapter creates missing tables, static database defaults, primary keys,
single-column unique constraints, declared indexes and owning-side foreign keys
inside a PostgreSQL transaction. Function defaults remain runtime defaults and
are not converted into frozen database values.

Tables are created with `IF NOT EXISTS`, indexes with `IF NOT EXISTS`, and
existing foreign keys are detected before creation. Running the operation more
than once is safe and existing data is not modified.

## Migrations

`PostgreAdapter` renders logical migration operations as PostgreSQL DDL and
executes pending migrations inside a transaction.

```ts
const plan = await engine.migrations.plan(migrations)
const result = await engine.migrations.apply(migrations)
```

Applied migrations are stored in `_opensya_migrations`. A PostgreSQL advisory
lock prevents concurrent deployment processes from applying the same migration.
Checksums protect applied artifacts from later modification.

Destructive and irreversible plans require explicit approval:

```ts
await engine.migrations.apply(migrations, {
  allowDestructive: true
})
```

## Runtime tables

```ts
for (const metadata of registry.getAll()) {
  adapter.buildTable(metadata)
}
```

`buildTable()` converts each `TableMetadata` into a Drizzle `pgTable` and indexes it by the logical metadata name.

::callout
---
icon: i-tabler-alert-triangle
color: warning
variant: subtle
---
Query operations fail when the logical table has not been built. Calling
`engine.schema.createTables()` builds every registered runtime table
automatically. Applications that manage DDL separately can continue calling
`buildTable()` directly.
::

## Column mapping

| Metadata | PostgreSQL builder | Runtime validation |
| --- | --- | --- |
| `uuid` | `uuid` | string |
| `string` | `text` | string |
| `text` | `text` | string |
| `integer` | `integer` | integer number |
| `bigint` | `bigint({ mode: 'bigint' })` | bigint |
| `boolean` | `boolean` | boolean |
| `timestamp` | `timestamp` | Date |
| `date` | `date` | string |
| `json` | `json` | any value |
| `decimal` | `numeric` | string or number |

The adapter maps primary keys, nullability, uniqueness, and static or factory defaults to the corresponding Drizzle builder methods.

## Query translation

The adapter compiles `QueryFilter` recursively:

- conditions at the same level are joined with `AND`;
- nested `and` groups use Drizzle `and()`;
- nested `or` groups use `or()`;
- `not` wraps the compiled nested expression;
- operators map to `eq`, `ne`, `inArray`, `notInArray`, comparisons, `isNull`, and `isNotNull`.

```ts
await adapter.findMany('users', {
  where: {
    and: [
      {
        conditions: [
          { field: 'active', operator: 'eq', value: true }
        ]
      },
      {
        or: [
          {
            conditions: [
              { field: 'role', operator: 'eq', value: 'admin' }
            ]
          },
          {
            conditions: [
              { field: 'role', operator: 'eq', value: 'owner' }
            ]
          }
        ]
      }
    ]
  },
  orderBy: [{ field: 'createdAt', direction: 'desc' }],
  limit: 20,
  offset: 0
})
```

## Adapter-level guards

Before executing SQL, the adapter verifies:

- filter, sort, insert, and update fields exist on the built table;
- `limit` and `offset` are not negative;
- `in` and `notIn` receive non-empty arrays;
- update and delete filters contain at least one effective constraint.

These checks also apply when the adapter is used directly. Direct calls do not, however, run Query Engine validators or lifecycle hooks.

## Transactions

```ts
await adapter.transaction(async tx => {
  const user = await tx.insert('users', input)

  await tx.insert('profiles', {
    id: crypto.randomUUID(),
    userId: user.id
  })
})
```

The callback receives a new adapter bound to the Drizzle transaction while sharing the previously built table map.

## PostgreSQL introspection

```ts
const actualSchema = await adapter.introspect()
```

The adapter queries `information_schema` directly. Introspection does not depend on the tables previously passed to `buildTable()`.

::steps{level="3"}
### Discover tables
Reads base tables from `information_schema.tables` where `table_schema = 'public'`.

### Discover columns
Reads column name, SQL data type, nullability, and ordinal position from `information_schema.columns`.

### Discover keys and indexes
Reads primary keys, unique indexes and standalone indexes from PostgreSQL
catalogs, preserving composite field order and uniqueness.

### Produce metadata
Returns `TableMetadata[]` with physical names used as both logical and collection names.
::

## Introspected SQL types

| PostgreSQL `data_type` | Metadata type |
| --- | --- |
| `uuid` | `uuid` |
| `character varying` | `string` |
| `text` | `text` |
| `integer` | `integer` |
| `bigint` | `bigint` |
| `boolean` | `boolean` |
| timestamp with or without time zone | `timestamp` |
| `date` | `date` |
| `json`, `jsonb` | `json` |
| `numeric` | `decimal` |
| any unrecognized type | `text` |

::callout
---
icon: i-tabler-info-circle
color: info
variant: subtle
title: Introspection boundaries
---
Foreign keys and relations are returned as empty arrays. Defaults, check
constraints and custom validators are not introspected. Unknown SQL types
deliberately fall back to `text` so consistency checking reports drift instead
of crashing.
::

## When to use the adapter directly

Use `QueryEngine` for domain operations. Use the adapter directly for infrastructure code that intentionally needs lower-level access, such as schema inspection or transaction-scoped operations inside hooks.
