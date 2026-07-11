---
title: Metadata and registry
description: Define the domain model once and preserve it through the typed runtime.
navigation:
  icon: i-tabler-schema
---

Metadata is the source of truth consumed by validation, relation resolution,
serialization, audit, schema checks and type inference.

## Preserve literal types

```ts
export const users = defineTable({
  name: 'users',
  collectionName: 'app_users',
  columns: [/* ... */],
  relations: [],
  tableValidators: [],
  indexes: [],
  audit: { enabled: true, excludedFields: ['password'] }
})
```

::callout
---
icon: i-tabler-alert-triangle
color: warning
variant: subtle
---
Avoid `const users: TableMetadata = {...}` when you need inference. That
annotation widens `"users"`, field names and column types to generic strings.
::

## Table shape

```ts
interface TableMetadata {
  name: string
  collectionName: string
  columns: ColumnMetadata[]
  relations: RelationMetadata[]
  tableValidators: TableValidatorMetadata[]
  indexes?: IndexMetadata[]
  audit?: AuditMetadata
}
```

Logical names are used by the engine; physical names are used by the adapter.

## Column types and inference

| Metadata type | Runtime and inferred type |
| --- | --- |
| `uuid`, `string`, `text`, `date` | `string` |
| `integer` | `number` |
| `bigint` | `bigint` |
| `boolean` | `boolean` |
| `timestamp` | `Date` |
| `decimal` | `string \| number` |
| `json` | `unknown` |

A nullable column becomes `T | null`. `hidden: true` removes the field from the
inferred result. A field using a dynamic `visibility` resolver becomes optional.

```ts
type User = InferTableEntity<typeof users>
```

## Defaults and validators

```ts
{
  name: 'createdAt',
  columnName: 'created_at',
  type: 'timestamp',
  nullable: false,
  primaryKey: false,
  unique: false,
  default: () => new Date(),
  validators: []
}
```

Defaults are applied for missing creation fields before before-create hooks.
Validators may be synchronous or asynchronous.

## Indexes

```ts
indexes: [
  {
    name: 'applications_tenant_status_idx',
    fields: ['tenantId', 'status'],
    unique: false
  }
]
```

Index fields use logical column names and preserve order. Registry validation
rejects empty indexes, duplicate names and unknown fields.

## Typed registry

```ts
const registry = createMetadataRegistry(users, posts, applications)
registry.lock()
```

The registry carries its table map into `QueryEngine`. TypeScript then restricts
table names and infers return types from the selected table.

The registry validates:

- unique physical collection names;
- unique logical and physical columns;
- at least one primary key per table;
- valid relation targets and fields;
- valid junction tables;
- declared indexes;
- fields listed in `audit.excludedFields`.

`lock()` aggregates validation errors and makes registration immutable.
