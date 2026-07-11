---
title: Production playground
description: Exercise the built package against an isolated PostgreSQL database.
navigation:
  icon: i-tabler-flask
---

The repository contains a private `playground` workspace that imports the built
`@opensya/persistence` package through its public exports.

## Start PostgreSQL

```bash
docker compose -f playground/compose.yaml up -d
cp playground/.env.example playground/.env
```

Never point the playground at a shared, staging or production database. Each
scenario drops and recreates its own tables.

## Run everything

```bash
pnpm install
pnpm playground
```

## Run one scenario

```bash
pnpm --dir playground test:crud
pnpm --dir playground test:relations
pnpm --dir playground test:audit-events
pnpm --dir playground test:pagination
```

The initial scenarios cover CRUD, defaults, validation, hooks, safe mutations,
relations, recursive serialization, audit, outbox publication and cursor
pagination.
