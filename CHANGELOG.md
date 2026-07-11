# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

No version has been tagged/published yet — `package.json` currently sits at
`0.2.1` as a pre-release working version.

### Added

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

- `DrizzleAdapter.introspect()` now derives `ColumnMetadata.unique` from real
  database state instead of always returning `false`. It also introspects
  standalone indexes via `pg_index`/`pg_class`, distinguishing them from the
  single-column unique indexes that back `column.unique`.
- `DrizzleAdapter.buildTable()` now creates the indexes declared in
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
