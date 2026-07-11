---
title: Architecture
description: How metadata, execution services, and database adapters work together.
navigation:
  icon: i-tabler-sitemap
---

OpenSya Persistence separates the description of a data model from the execution of database operations.

## Runtime overview

```text
Application service
        │
        ▼
    QueryEngine
   ┌────┼──────────────┐
   ▼    ▼              ▼
Registry Hooks   RelationResolver
        │              │
        └──────┬───────┘
               ▼
       DatabaseAdapter
               │
               ▼
            Database
```

## Components

::accordion
  :::accordion-item{label="MetadataRegistry" icon="i-tabler-schema"}
  Stores `TableMetadata`, rejects duplicate logical names, validates the complete schema, and becomes immutable after `lock()`.
  :::

  :::accordion-item{label="QueryEngine" icon="i-tabler-engine"}
  Provides application-facing reads and mutations. It coordinates defaults, hooks, validation, transactions, safe targeting, and relation population.
  :::

  :::accordion-item{label="HooksRegistry" icon="i-tabler-arrows-split"}
  Stores ordered callbacks for create, update, and delete operations. Before hooks may transform data; after hooks run before the transaction commits.
  :::

  :::accordion-item{label="RelationResolver" icon="i-tabler-link"}
  Resolves explicitly requested direct relations by batching key values and grouping related rows in memory.
  :::

  :::accordion-item{label="DatabaseAdapter" icon="i-tabler-database-cog"}
  Defines the storage contract: reads, inserts, updates, deletes, transactions, runtime table construction, and schema introspection.
  :::

  :::accordion-item{label="ConsistencyChecker" icon="i-tabler-database-search"}
  Compares declared metadata with the schema returned by `DatabaseAdapter.introspect()`.
  :::

  :::accordion-item{label="FieldSerializer" icon="i-tabler-eye-off"}
  Removes hidden and context-sensitive fields from base entities and populated relations.
  :::

  :::accordion-item{label="AuditManager" icon="i-tabler-history"}
  Produces before/after snapshots and field changes through a transaction-scoped writer.
  :::

  :::accordion-item{label="Domain Events" icon="i-tabler-broadcast"}
  Collects business events inside application transactions, stores them in an outbox, and publishes them through an injectable processor.
  :::
::

## Read path

::steps{level="3"}
### Resolve table metadata
Unknown logical table names fail through `registry.getOrThrow()`.

### Query the adapter
The engine forwards filters, sorting, limit, and offset.

### Populate requested relations
When `populate` is present, the resolver loads each named direct relation.

### Serialize and return typed data
Hidden and contextual fields are removed, including inside populated relations.
The entity type is inferred from the registered table metadata.
::

Reads do not run lifecycle hooks and are not automatically transactional.

## Mutation path

::tabs
  :::tab{label="Create" icon="i-tabler-plus"}
  Defaults → before hooks → known-field check → complete validation → insert → after hooks.
  :::

  :::tab{label="Update" icon="i-tabler-edit"}
  Safe-filter check → load current rows → before hooks → merge and validate touched fields → update → after hooks.
  :::

  :::tab{label="Delete" icon="i-tabler-trash"}
  Safe-filter check → resolve target when needed → before hooks → delete → after hooks.
  :::
::

All mutation steps execute inside `adapter.transaction()`. When configured,
audit entries use that same adapter. Application transactions additionally
flush collected Domain Events to the outbox before the outer commit.

## Logical and physical identifiers

| Property | Used by | Example |
| --- | --- | --- |
| `TableMetadata.name` | Engine and adapter lookup | `users` |
| `TableMetadata.collectionName` | Physical table construction and consistency matching | `app_users` |
| `ColumnMetadata.name` | Entities, filters, and sorting | `createdAt` |
| `ColumnMetadata.columnName` | PostgreSQL column construction and consistency matching | `created_at` |

## Adapter independence

The Query Engine does not import Drizzle types. A custom adapter can target another store if it preserves the contract and semantics.

::callout
---
icon: i-tabler-shield-check
color: primary
variant: subtle
---
A custom adapter should preserve non-empty mutation filters, field validation, transactional callbacks, predictable return values, and read-only introspection.
::
