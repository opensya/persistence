---
title: Migrations
description: Generate, review and execute versioned database migrations from Persistence metadata.
navigation:
  icon: i-tabler-database-export
---

Persistence migrations describe how a versioned schema snapshot evolves into
the metadata currently registered by the application. The generated artifact
is database-neutral; the active adapter renders and executes its operations.

## Store migration files

Persistence includes filesystem helpers for keeping ordered JSON artifacts in
source control. `loadMigrations()` reads numbered files in lexical order,
`lastMigration()` returns the last recorded schema snapshot, and
`saveMigration()` creates the directory and writes the next numbered file.

```ts
import {
  lastMigration,
  loadMigrations,
  saveMigration
} from '@opensya/persistence/migrations'

const directory = './migrations'
const migrations = await loadMigrations(directory)

const migration = engine.migrations.generate({
  name: 'add-user-age',
  previous: lastMigration(migrations)
})

await saveMigration(directory, migration)
```

The generated filename uses an ordered prefix, for example:

```text
migrations/
├── 001-create-users-a82cdb26e5c1.json
└── 002-add-user-age-4d79be92fe10.json
```

When the directory is empty or does not exist, `loadMigrations()` returns an
empty array and `lastMigration()` returns `EMPTY_SCHEMA_SNAPSHOT`. The same
workflow therefore handles the first migration without special branching.

## Generate without filesystem helpers

Artifacts can also be managed by another storage layer or build tool. The
first migration starts from an empty snapshot:

```ts
import { writeFile } from 'node:fs/promises'
import {
  EMPTY_SCHEMA_SNAPSHOT,
  serializeMigration
} from '@opensya/persistence/migrations'

const migration = engine.migrations.generate({
  name: 'create initial schema',
  previous: EMPTY_SCHEMA_SNAPSHOT
})

await writeFile(
  `migrations/${migration.id}.json`,
  serializeMigration(migration)
)
```

For later migrations, pass the `next` snapshot from the last committed
artifact:

```ts
const migration = engine.migrations.generate({
  name: 'add user status',
  previous: migrations.at(-1)?.next ?? EMPTY_SCHEMA_SNAPSHOT
})
```

Snapshots contain only physical schema information. Validators, hooks, field
visibility and runtime function defaults are not converted into database DDL.

## Review the plan

Reload the committed artifacts and append a newly generated migration if it
has not been saved yet:

```ts
const migrations = await loadMigrations('./migrations')
```

```ts
const plan = await engine.migrations.plan(migrations)

for (const migration of plan.migrations) {
  console.log(migration.migrationId)
  console.log(migration.statements)
}
```

Every logical operation is classified as `safe`, `destructive` or
`irreversible`. Adding a nullable column is safe; dropping a column or table is
irreversible because Persistence cannot restore its data.

Use a dry run to obtain the complete physical plan without changing the
database:

```ts
const result = await engine.migrations.apply(migrations, {
  dryRun: true
})
```

## Apply pending migrations

```ts
const result = await engine.migrations.apply(migrations)

console.log(result.applied)
console.log(result.skipped)
```

Files must be passed in their numbered order. The loader already guarantees
that order. Applied migrations are skipped, so the complete list can be used
for every deployment.

Destructive plans are rejected unless they are explicitly approved after
review:

```ts
await engine.migrations.apply(migrations, {
  allowDestructive: true
})
```

## Inspect status

```ts
const status = await engine.migrations.status(migrations)
```

`PostgreAdapter` records applied identifiers, checksums, timestamps, execution
durations and failed attempts in `_opensya_migrations`. Reapplying the same
artifact is idempotent. A failed artifact remains retryable with the same
checksum. Changing an artifact after an attempt causes a checksum error.

## Deployment rules

- Commit generated artifacts with the application code.
- Use `saveMigration()` or another strategy that preserves an explicit order.
- Review the rendered plan before deployment.
- Never edit an applied migration; generate a corrective migration.
- Require explicit approval for destructive operations.
- Keep migration files in their original order.
- Do not run migrations automatically on every application startup.
