---
title: OpenSya Persistence
description: A metadata-driven persistence engine for TypeScript applications, powering OpenSya.
navigation: false
---

# OpenSya Persistence

The persistence engine behind OpenSya, available to any TypeScript application.

Declare the domain once. Persistence executes validation, relations, lifecycle
hooks, transactions, audit trails and domain events consistently, while the
database remains behind an adapter.

::u-page-grid
---
class: gap-3 mt-16
---

::u-page-card
---
title: Getting started
description: Define a typed table and execute your first PostgreSQL query.
icon: i-tabler-rocket
to: /getting-started
spotlight: true
class: shadow-lg
ui:
  leading: h-38 flex items-start
---
::

::u-page-card
---
title: Metadata and inference
description: Model tables once and infer every returned entity automatically.
icon: i-tabler-schema
to: /concepts/metadata-and-registry
spotlight: true
class: shadow-lg
ui:
  leading: h-38 flex items-start
---
::

::u-page-card
---
title: Query Engine
description: Read and mutate data through the validated execution runtime.
icon: i-tabler-database
to: /concepts/query-engine
spotlight: true
class: shadow-lg
ui:
  leading: h-38 flex items-start
---
::

::

## Runtime features

::u-page-grid
---
class: gap-3
---

::u-page-card{title="Validation" description="Structural, field and cross-field rules." icon="i-tabler-checkup-list" to="/guides/validation"}
::

::u-page-card{title="Relations" description="Explicit batched population for every cardinality." icon="i-tabler-link" to="/guides/relations"}
::

::u-page-card{title="Field visibility" description="Keep secrets and contextual fields out of results." icon="i-tabler-eye-off" to="/guides/field-visibility"}
::

::u-page-card{title="Audit Log" description="Record transactional before/after snapshots and changes." icon="i-tabler-history" to="/guides/audit-log"}
::

::u-page-card{title="Domain Events" description="Persist typed events atomically and publish them safely." icon="i-tabler-broadcast" to="/guides/domain-events"}
::

::u-page-card{title="Cursor pagination" description="Stable keyset pagination without OFFSET." icon="i-tabler-arrow-bar-to-down" to="/guides/cursor-pagination"}
::

::

## What it owns

- a typed metadata registry and schema validation;
- a database-independent query model;
- inferred result types from table metadata;
- safe, transactional mutations and lifecycle hooks;
- explicit relation population and result serialization;
- transactional audit logs and domain-event outboxes;
- PostgreSQL execution and introspection through Drizzle.

::callout
---
icon: i-tabler-info-circle
color: neutral
variant: subtle
---
Persistence does not generate migrations and does not replace Drizzle. It gives
OpenSya one runtime for executing domain rules around database operations.
::