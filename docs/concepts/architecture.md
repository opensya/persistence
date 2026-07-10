---
title: Architecture
description: Understand how OpenSya Persistence separates domain execution from database access.
navigation:
  icon: i-tabler-sitemap
---

OpenSya Persistence is organized around a small set of components with explicit responsibilities.

::u-callout
---
icon: i-tabler-bulb
color: primary
variant: subtle
title: Core idea
---
Application services talk to the Query Engine. The Query Engine coordinates domain rules and delegates database operations to an adapter.
::

## Runtime layers

::u-page-grid
  ::u-page-card
  ---
  icon: i-tabler-apps
  title: Application services
  description: Express use cases and invoke persistence operations.
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  icon: i-tabler-engine
  title: Query Engine
  description: Coordinates reads, validation, hooks, relations, and mutations.
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  icon: i-tabler-schema
  title: Metadata Registry
  description: Stores and validates the declared persistence model.
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  icon: i-tabler-plug-connected
  title: Database Adapter
  description: Translates generic operations into database-specific queries.
  spotlight: true
  ---
  ::
::

```text
Application services
        │
        ▼
    QueryEngine
        │
        ├───────────────┐
        ▼               ▼
MetadataRegistry   HooksRegistry
        │
        ▼
 RelationResolver
        │
        ▼
 DatabaseAdapter
        │
        ▼
     Database
```

## Component responsibilities

::u-accordion
  :::u-accordion-item{label="Metadata layer" icon="i-tabler-schema"}
  A `TableMetadata` describes the logical name, physical collection, columns, relations, field validators, and table validators. The `MetadataRegistry` checks the schema before the application begins serving requests.
  :::

  :::u-accordion-item{label="Query layer" icon="i-tabler-engine"}
  The `QueryEngine` is the application-facing API. It coordinates table lookup, defaults, lifecycle hooks, validation, transactions, safe mutations, and explicit relation population.
  :::

  :::u-accordion-item{label="Relation layer" icon="i-tabler-link"}
  The `RelationResolver` uses declared metadata to load direct relations in batches and attach them to returned entities.
  :::

  :::u-accordion-item{label="Adapter layer" icon="i-tabler-database-cog"}
  The `DatabaseAdapter` contract isolates the engine from a specific ORM. The built-in implementation uses Drizzle and PostgreSQL.
  :::
::

## Mutation pipelines

::u-tabs
  :::u-tab{label="Create" icon="i-tabler-plus"}
  ::u-steps{level="4"}
  #### Start a transaction
  #### Apply metadata defaults
  #### Run before-create hooks
  #### Verify fields and validate the entity
  #### Insert through the transaction adapter
  #### Run after-create hooks
  #### Commit or roll back
  ::
  :::

  :::u-tab{label="Update" icon="i-tabler-edit"}
  ::u-steps{level="4"}
  #### Reject an empty filter
  #### Start a transaction and load current rows
  #### Run before-update hooks
  #### Merge the patch and validate affected fields
  #### Update through the transaction adapter
  #### Run after-update hooks
  #### Commit or roll back
  ::
  :::

  :::u-tab{label="Delete" icon="i-tabler-trash"}
  ::u-steps{level="4"}
  #### Reject an empty filter
  #### Start a transaction
  #### Resolve the target for `deleteOne()`
  #### Run before-delete hooks
  #### Delete through the transaction adapter
  #### Run after-delete hooks
  #### Commit or roll back
  ::
  :::
::

## Logical and physical names

| Metadata property | Purpose | Example |
| --- | --- | --- |
| `TableMetadata.name` | Logical identifier used by the engine | `users` |
| `TableMetadata.collectionName` | Physical PostgreSQL table | `app_users` |
| `ColumnMetadata.name` | Entity and filter field | `createdAt` |
| `ColumnMetadata.columnName` | Physical database column | `created_at` |

::u-callout
---
icon: i-tabler-arrows-exchange
color: info
variant: subtle
---
The separation keeps application naming stable while allowing the physical database to follow another naming convention.
::

## Adapter contract

A database adapter implements:

::u-page-grid
  ::u-page-card{title="Reads" description="findMany and findOne" icon="i-tabler-search"}
  ::
  ::u-page-card{title="Mutations" description="insert, update, and delete" icon="i-tabler-pencil"}
  ::
  ::u-page-card{title="Transactions" description="transaction-scoped operations" icon="i-tabler-arrows-transfer-up"}
  ::
  ::u-page-card{title="Schema" description="buildTable and introspect" icon="i-tabler-database"}
  ::
::

Custom adapters should preserve the built-in safety guarantees: field verification, non-empty mutation filters, transactional callbacks, and consistent return values.
