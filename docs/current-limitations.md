---
title: Current limitations
description: Technical boundaries of OpenSya Persistence version 0.0.1.
navigation:
  icon: i-tabler-barrier
---

OpenSya Persistence `0.0.1` provides the core runtime, Drizzle PostgreSQL execution, and initial schema introspection. The following boundaries remain.

## Static typing

Entity return types are caller-provided generics rather than types inferred from metadata.

```ts
const user = await engine.findOne<User>('users', params)
```

Field names, operator values, and returned entities are therefore not statically linked to a registered table.

## Introspection scope

PostgreSQL introspection is implemented, but intentionally incomplete.

| Introspected | Not introspected |
| --- | --- |
| public base tables | non-public schemas and views |
| column names and order | defaults |
| mapped SQL types | unique constraints |
| nullability | indexes and check constraints |
| primary keys | foreign keys and relations |

Unknown PostgreSQL types map to `text`. This allows drift reporting to continue, but can produce a type mismatch for unsupported types.

## Consistency comparison

The checker compares table existence, column existence, extra columns, mapped type, nullability, and primary-key status.

It does not compare uniqueness, relations, defaults, indexes, or PostgreSQL type details such as varchar length and numeric precision.

## Schema lifecycle

Persistence does not generate, apply, or roll back migrations. `buildTable()` constructs runtime Drizzle tables only. Continue using a dedicated migration workflow for physical schema changes.

## Relations

Only explicitly requested direct relations are supported. There is no nested population, relation-specific filtering, ordering, pagination, or projection.

Relation metadata is not inferred from PostgreSQL foreign keys.

## Authorization and tenancy

The engine carries `user`, `tenantId`, and custom context to hooks but does not enforce policies automatically.

Applications must implement:

- operation authorization;
- row-level access;
- ownership checks;
- tenant field injection;
- mandatory tenant filters.

## Events and external effects

There is no built-in domain-event bus or transactional outbox. Hooks can write outbox records with the transaction adapter, but delivery belongs to the application.

## Hooks

- reads have no lifecycle hooks;
- after-delete hooks do not receive deleted entities or row counts;
- update-many uses one transformed patch for every matched entity;
- after-update runs once per returned entity.

## Validation

Partial updates validate touched fields and table validators referencing those fields. Existing invalid values in unrelated untouched fields are not rediscovered.

Application validators cannot replace database constraints for concurrency-sensitive invariants.

## Database support

Only the Drizzle PostgreSQL adapter is included. The adapter reads only PostgreSQL's `public` schema during introspection.

::u-callout
---
icon: i-tabler-flask
color: warning
variant: subtle
---
Treat the public API as early-stage. Review release changes before upgrading and verify behavior with integration tests against PostgreSQL.
::
