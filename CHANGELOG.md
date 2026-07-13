# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- `createQueryEngine()` now accepts a named options object containing
  `registry`, `adapter`, `hooks`, `serializer`, `audit` and `outbox`. This
  replaces the positional signature and makes optional dependency injection
  explicit and less error-prone.

### Added

- **Metadata-driven migrations.** Persistence can capture serializable schema
  snapshots, generate deterministic migration artifacts, classify operations
  as safe, destructive or irreversible, and expose plans before execution.
  `PostgreAdapter` renders and applies migrations transactionally, records
  identifiers and checksums in `_opensya_migrations`, prevents concurrent
  runners with an advisory lock, supports dry runs and skips migrations that
  were already applied. Migration APIs are available through
  `engine.migrations` and the `@opensya/persistence/migrations` export.
  Node.js filesystem helpers load ordered JSON artifacts, resolve the latest
  schema snapshot and save migrations with numbered sequence prefixes.

## [0.4.0] - 2026-07-12

### Added

- **Metadata-driven schema creation.** A locked registry can now create its
  physical database resources through `engine.schema.createTables()`. Schema
  creation is adapter-driven, idempotent and non-destructive by default. The
  Drizzle PostgreSQL adapter creates missing tables, columns, primary keys,
  unique constraints, declared indexes and supported foreign keys inside a
  transaction. Existing tables are preserved and reported as skipped, while
  adapters without schema support fail with an explicit capability error.

### Changed

- Renamed `DrizzleAdapter` to `PostgreAdapter` and `createDrizzleAdapter()` to
  `createPostgreAdapter()` to identify the supported database rather than the
  internal query builder used by the implementation.

## [0.3.2] - 2026-07-12

### Added

- A standalone `playground` workspace that consumes the built package against
  a real PostgreSQL database. Its initial independent scenarios cover CRUD,
  defaults, validation, hooks, safe mutations, relations, recursive field
  serialization, transactional audit entries, domain-event outbox processing
  and cursor pagination. It includes typed assertions, isolated schema resets,
  per-scenario scripts, an environment template and a dedicated PostgreSQL
  Docker Compose service.
- **Metadata-driven entity type inference.** `defineTable()` preserves literal
  table names, column names and column types, while a chainable typed
  `MetadataRegistry` carries that schema into `QueryEngine`. Calls such as
  `engine.findOne("users")`, `create`, `findMany`, `findPage`, `updateOne` and
  `updateMany` now infer their entity type without an explicit generic. The
  inference maps persistence types to TypeScript primitives, includes `null`
  for nullable columns, removes fields declared `hidden: true`, and makes
  fields with dynamic `visibility` optional. Explicit generics remain
  supported for backward compatibility.
- **Cursor pagination.** `QueryEngine.findPage()` returns `{ data, pageInfo }`
  with an opaque `endCursor` and `hasNextPage`. Requested ordering is made
  deterministic by automatically appending missing primary-key fields, and
  cursors carry their ordering signature to prevent reuse with incompatible
  queries. Compound ascending/descending keyset filters, `Date` and `bigint`
  cursor values, populated relations and field serialization are supported.
  Page sizes default to 50 and are constrained to 1–100. Ordering fields must
  be non-null for cursor creation.
- **Transactional domain events and outbox.** `QueryEngine` now exposes an
  application-level `transaction(context, callback)` API. Inside the callback,
  `tx.events.emit(type, payload, options)` collects strongly typed domain
  events and writes them to an outbox with the same transaction-scoped adapter
  as the domain mutations. A failed outbox write rolls back the complete use
  case. The transport-agnostic API includes `DomainEventCollector`,
  `DatabaseOutboxWriter`, `createOutboxMetadata()` and the
  `@opensya/persistence/events` subpath export. `OutboxProcessor` safely claims
  pending records per worker, publishes them through an injectable
  `EventPublisher`, retries failures with configurable exponential backoff and
  marks exhausted events as `failed`. Stale `processing` claims are released
  automatically after a configurable timeout, providing at-least-once delivery
  even when a worker stops during publication.
- **Transactional audit log.** Tables can opt in with
  `audit: { enabled: true, excludedFields?: [...] }`. The new `AuditManager`
  records one entry per created, updated, or deleted entity, including primary
  key values, before/after snapshots, field-level changes, actor, tenant,
  request and timestamp. Audit writes receive the same transaction-scoped
  adapter as the mutation, so a failed audit write rolls the mutation back.
  Sensitive excluded fields never appear in snapshots or changes. Bulk update
  and delete operations produce one audit entry per affected entity. The audit
  API is also available from the `@opensya/persistence/audit` subpath. A
  `DatabaseAuditWriter` implementation stores entries through any logical
  audit table registered with the active adapter, and registry validation
  rejects unknown fields in `excludedFields`. `createAuditLogMetadata()`
  provides the standard non-recursive `audit_logs` table definition.
- **Field visibility & serialization.** `ColumnMetadata` gains `hidden` (always
  strip the field from results) and `visibility` (an async per-request
  resolver receiving `{ user, entity, requestId?, tenantId? }`). A new
  `FieldSerializer` (`src/query-engine/serializer.ts`) applies these rules to
  every value the `QueryEngine` returns — `findMany`, `findOne`, `create`,
  `updateOne`, `updateMany` — including recursively into populated relations.
  This is purely about what appears in results; it has no effect on reads at
  the adapter level, writes, validation, or lifecycle hooks (hooks still
  receive the full, unserialized entity). `findMany`/`findOne` now accept an
  optional `context` (`{ user, requestId?, tenantId? }`), mirroring the one
  already used by `create`/`update`/`delete`.
- `IndexMetadata` and an optional `TableMetadata.indexes` field, so composite
  and named single-field indexes can be declared alongside columns.
- `ConsistencyChecker` now detects drift on composite indexes (missing,
  extra, or mismatched fields/uniqueness) in addition to columns.
- Subpath exports (`@opensya/persistence/adapter`, `/metadata`, `/hooks`,
  `/relations`, `/sync`, `/query-engine`), so consumers can import a single
  layer without pulling in the rest of the package.
- `CONTRIBUTING.md`.
- This changelog.

### Changed

- `PostgreAdapter.introspect()` now derives `ColumnMetadata.unique` from real
  database state instead of always returning `false`. It also introspects
  standalone indexes via `pg_index`/`pg_class`, distinguishing them from the
  single-column unique indexes that back `column.unique`.
- `PostgreAdapter.buildTable()` now creates the indexes declared in
  `TableMetadata.indexes` on the underlying Drizzle table.
- `MetadataRegistry.validate()` now validates declared indexes (duplicate
  names, empty field lists, references to unknown fields).
- All `ConsistencyChecker` drift messages are now in English (previously a
  mix of English and French, inconsistent with the rest of the codebase).
- `OPENSYA_DATABASE_VERSION` is now injected at build time from
  `package.json`'s `version` field (via `tsdown`'s `env` option) instead of
  being hand-maintained — it can no longer drift out of sync.

### Fixed

- `OPENSYA_DATABASE_VERSION` previously reported `0.0.1` regardless of the
  actual package version.

[Unreleased]: https://github.com/opensya/persistence/compare/v0.4.0...HEAD
[0.3.2]: https://github.com/opensya/persistence/releases/tag/v0.3.2
[0.4.0]: https://github.com/opensya/persistence/releases/tag/v0.4.0
