# Current limitations

OpenSya Persistence is currently published as version `0.0.1`. The core runtime is present, but the following boundaries should be understood before production adoption.

## PostgreSQL introspection

`DrizzleAdapter.introspect()` is not implemented. It currently throws an error.

Consequences:

- `ConsistencyChecker.check()` cannot run with the built-in adapter;
- declared metadata cannot yet be compared automatically with a live PostgreSQL schema;
- migrations remain an external responsibility.

## Schema creation and migrations

`buildTable()` creates Drizzle runtime table objects only. It does not:

- create PostgreSQL tables;
- alter existing tables;
- generate migration files;
- apply migrations.

Use an external migration workflow to provision the physical schema.

## Type inference

Return types are supplied through generics:

```ts
const user = await engine.findOne<User>("users", params);
```

Entity types are not inferred from `TableMetadata`. Metadata field names and filter values are currently string-based rather than statically constrained.

## Relations

The resolver supports direct relation population, but not:

- nested populate paths;
- per-relation filters;
- relation sorting;
- relation pagination;
- projections or selected fields;
- automatic population.

## Authorization

Authorization is not built into the query engine. The mutation context can carry a user or tenant, but the engine does not automatically enforce:

- role-based access;
- row-level permissions;
- tenant isolation;
- ownership constraints.

These rules must currently be implemented in application services, lifecycle hooks, or the database.

## Multi-tenancy

Passing `tenantId` in the query context only makes it available to hooks. It does not automatically add tenant filters or tenant fields.

## Domain events

There is no built-in domain-event dispatcher or transactional outbox. After hooks run inside the transaction, so slow or unreliable external side effects should be delegated to an application-managed outbox.

## Read hooks

The hooks registry currently covers create, update, and delete operations. There are no before-read or after-read hooks.

## Delete hook payload

After-delete hooks receive context but not the deleted entity or affected row count.

## Partial update validation

During updates, structural and field validation is limited to fields touched by the resolved patch. Table validators run when one of their declared fields is touched.

This is efficient, but existing invalid data in untouched fields is not rediscovered by every update.

## Adapter scope

Only the PostgreSQL Drizzle adapter is included today. The architecture supports custom adapters, but compatibility depends on each implementation preserving the query and transaction contract.

## Roadmap candidates

The current design naturally leaves room for:

- PostgreSQL introspection;
- schema-drift reporting;
- stronger metadata-driven type inference;
- authorization policies;
- tenant-aware query enforcement;
- audit logs;
- domain events and an outbox;
- nested relation loading;
- additional database adapters;
- generated APIs.

These items describe possible evolution and are not commitments for a specific release.
