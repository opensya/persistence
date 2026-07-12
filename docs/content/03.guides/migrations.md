---
title: Migrations
description: Generate, review and execute versioned database migrations from Persistence metadata.
navigation:
  icon: i-tabler-database-export
---

Persistence migrations describe how a versioned schema snapshot evolves into
the metadata currently registered by the application. The generated artifact
is database-neutral; the active adapter renders and executes its operations.

## Generate a migration

The first migration starts from an empty snapshot:

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

For the next migration, pass the `next` snapshot from the last committed
artifact:

```ts
const migration = engine.migrations.generate({
  name: 'add user status',
  previous: lastMigration.next
})
```

Snapshots contain only physical schema information. Validators, hooks, field
visibility and runtime function defaults are not converted into database DDL.

## Review the plan

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
- Review the rendered plan before deployment.
- Never edit an applied migration; generate a corrective migration.
- Require explicit approval for destructive operations.
- Keep migration files in their original order.
- Do not run migrations automatically on every application startup.
