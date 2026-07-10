---
title: Current limitations
description: Understand the boundaries of OpenSya Persistence version 0.0.1.
navigation:
  icon: i-tabler-barrier
---

::u-callout
---
icon: i-tabler-flask
color: warning
variant: subtle
title: Early release
---
OpenSya Persistence is currently published as version `0.0.1`. The core runtime is available, but several production capabilities remain under development.
::

## Capability status

::u-page-grid
  ::u-page-card
  ---
  title: Query Engine
  description: Reads, safe mutations, transactions, defaults, validation, and hooks are implemented.
  icon: i-tabler-circle-check
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  title: Drizzle adapter
  description: PostgreSQL CRUD and filter translation are implemented.
  icon: i-tabler-circle-check
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  title: Relations
  description: Direct explicit population is implemented; nested loading is not.
  icon: i-tabler-progress
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  title: Introspection
  description: PostgreSQL schema introspection is not implemented.
  icon: i-tabler-circle-x
  spotlight: true
  ---
  ::
::

## Schema management

::u-accordion
  :::u-accordion-item{label="PostgreSQL introspection" icon="i-tabler-database-search"}
  `DrizzleAdapter.introspect()` currently throws an error. Therefore, `ConsistencyChecker.check()` cannot compare metadata with a live PostgreSQL schema through the built-in adapter.
  :::

  :::u-accordion-item{label="Schema creation" icon="i-tabler-table-plus"}
  `buildTable()` creates runtime Drizzle objects only. It does not create or alter PostgreSQL tables.
  :::

  :::u-accordion-item{label="Migrations" icon="i-tabler-file-database"}
  Persistence does not generate or apply migration files. Use an external migration workflow.
  :::
::

## Type system

Return types are supplied through generics:

```ts
const user = await engine.findOne<User>('users', params)
```

::u-callout
---
icon: i-tabler-code
color: info
variant: subtle
---
Entity types are not currently inferred from `TableMetadata`. Metadata field names and filter values remain string-based.
::

## Relations

The resolver currently supports direct population but not:

::u-page-grid
  ::u-page-card{title="Nested paths" description="Paths such as projects.owner are not supported." icon="i-tabler-sitemap-off"}
  ::
  ::u-page-card{title="Relation filters" description="Per-relation filter expressions are unavailable." icon="i-tabler-filter-off"}
  ::
  ::u-page-card{title="Pagination" description="Related collections cannot be paginated independently." icon="i-tabler-list-numbers"}
  ::
  ::u-page-card{title="Projections" description="Related fields cannot be explicitly selected." icon="i-tabler-columns-off"}
  ::
::

## Authorization and multi-tenancy

::u-tabs
  :::u-tab{label="Authorization" icon="i-tabler-lock"}
  The Query Engine does not automatically enforce roles, row-level permissions, ownership constraints, or authorization policies.
  :::

  :::u-tab{label="Multi-tenancy" icon="i-tabler-building"}
  Passing `tenantId` in the mutation context exposes it to hooks but does not automatically add tenant fields or query filters.
  :::
::

Implement these rules in application services, lifecycle hooks, dedicated policies, or the database.

## Events and side effects

There is no built-in domain-event dispatcher or transactional outbox.

::u-callout
---
icon: i-tabler-mail-exclamation
color: warning
variant: subtle
---
After hooks run inside the transaction. Delegate slow or unreliable effects such as emails, webhooks, and broker publishing to an application-managed outbox.
::

## Hooks

::u-accordion
  :::u-accordion-item{label="No read hooks" icon="i-tabler-eye-off"}
  The registry covers create, update, and delete operations only.
  :::

  :::u-accordion-item{label="Limited after-delete payload" icon="i-tabler-trash"}
  After-delete hooks receive context but not the deleted entity or affected row count.
  :::

  :::u-accordion-item{label="Partial update validation" icon="i-tabler-edit"}
  Updates validate touched fields and relevant table validators. Invalid data in untouched fields is not rediscovered on every patch.
  :::
::

## Adapter scope

Only the PostgreSQL Drizzle adapter is included. The architecture supports custom adapters, but each implementation must preserve the query, safety, and transaction contracts.

## Roadmap candidates

::u-page-grid
  ::u-page-card{title="PostgreSQL introspection" icon="i-tabler-database-search" description="Read and compare live schemas."}
  ::
  ::u-page-card{title="Type inference" icon="i-tabler-brand-typescript" description="Derive entity and query types from metadata."}
  ::
  ::u-page-card{title="Authorization" icon="i-tabler-shield-lock" description="Introduce explicit data access policies."}
  ::
  ::u-page-card{title="Tenant enforcement" icon="i-tabler-building-community" description="Apply tenant constraints consistently."}
  ::
  ::u-page-card{title="Domain events" icon="i-tabler-broadcast" description="Publish transactional domain changes."}
  ::
  ::u-page-card{title="Nested relations" icon="i-tabler-sitemap" description="Populate deeper relation graphs."}
  ::
::

::u-callout
---
icon: i-tabler-calendar-question
color: neutral
variant: subtle
---
These are possible directions, not commitments for a specific release.
::
