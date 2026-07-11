# OpenSya Persistence Playground

Integration scenarios that consume the built `@opensya/persistence` package
against a real PostgreSQL database.

## Setup

1. Start the dedicated PostgreSQL container:

```bash
docker compose -f playground/compose.yaml up -d
```

2. Copy `playground/.env.example` to `playground/.env`.
3. From the repository root, run:

```bash
pnpm install
pnpm playground
```

Each scenario recreates its own tables and deletes all playground data. Never
point `DATABASE_URL` to a shared, staging or production database.

You can also use an existing dedicated PostgreSQL database by changing
`DATABASE_URL`; Docker is not required in that case.

Individual scenarios can be run from this directory:

```bash
pnpm test:crud
pnpm test:relations
pnpm test:audit-events
pnpm test:pagination
```

## Initial coverage

- CRUD, defaults, validation, hooks and safe mutations
- relation population and hidden-field serialization
- transactional audit log and domain-event outbox processing
- stable cursor pagination with duplicate ordering values
