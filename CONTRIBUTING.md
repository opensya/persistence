# Contributing to OpenSya Persistence

Thanks for taking the time to contribute. This project is still young and
evolving quickly, so this guide will evolve with it — suggestions welcome.

## Ways to contribute

- **Bug reports** — open an issue with a minimal repro (a table definition
  - the call that misbehaves is usually enough).
- **Bug fixes / small improvements** — open a PR directly.
- **New capabilities** (new adapter, new hook type, authorization,
  multi-tenancy...) — please open an issue first to discuss the design.
  These touch the core execution pipeline described in
  [`ARCHITECTURE.md`](./ARCHITECTURE.md), so it's worth agreeing on the
  approach before writing code.

## Project structure

The engine is organized in independent layers, each with a single
responsibility. Start with [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the
full picture; in short:

| Directory          | Responsibility                                          |
| ------------------ | ------------------------------------------------------- |
| `src/metadata`     | Schema source of truth (`MetadataRegistry`)             |
| `src/adapter`      | Database-specific implementation (currently Drizzle)    |
| `src/hooks`        | Lifecycle hooks (before/after create, update, delete)   |
| `src/relations`    | Relation loading (`populate`)                           |
| `src/sync`         | Declared-schema vs actual-database drift detection      |
| `src/query-engine` | Orchestrates everything above into `create`/`find`/etc. |

A change that only affects one layer should, ideally, only touch that
layer's directory plus its `types.ts`.

## Development setup

```bash
pnpm install
```

- `pnpm build` — bundles the package with `tsdown` (ESM + CJS + `.d.ts`).
- `pnpm dev` — runs `scratch/query-engine-test.ts` with `tsx`; this is the
  closest thing to a manual smoke test right now (see "Testing" below).

Type-checking and linting don't have dedicated `pnpm` scripts yet, so run
them directly while that's being sorted out:

```bash
npx tsc --noEmit
npx eslint .
```

The `tsconfig.json` is intentionally strict (`noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noUnusedLocals`, etc.) — please don't loosen
it to make a change compile.

## Testing

**Honest state of things:** there is no automated test suite yet. The
`scratch/query-engine-test.ts` script is a manual playground against a real
Postgres database, not a substitute for real tests.

Until proper integration tests land (this is one of the highest-priority
gaps in the project — see the open issues), please:

1. Verify your change manually against a real Postgres instance (a local
   one or `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`
   is enough) by extending `scratch/query-engine-test.ts` or a similar
   throwaway script.
2. Describe in the PR what you tested and how, since a reviewer can't rely
   on a green CI test run for correctness yet.

If you're up for it, contributions that add a real test setup (e.g.
`vitest` + a disposable Postgres container per run) are extremely welcome
and don't require prior discussion.

## Coding conventions

- **English only** for identifiers, comments, error messages, and any
  string a consumer of the package might see. This is a public package —
  keep it consistent for non-French-speaking users.
- Keep the adapter interface (`DatabaseAdapter`) database-agnostic. If a
  change only makes sense for Postgres/Drizzle, it belongs in
  `src/adapter/drizzle-adapter.ts`, not in the query engine.
- New metadata fields (e.g. on `TableMetadata`, `ColumnMetadata`) should be
  **optional** whenever possible, to avoid breaking existing table
  definitions in downstream apps.
- Favor explicit, descriptive errors over silent fallbacks — see
  `UnsafeMutationError` and `ValidationError` in `src/query-engine/types.ts`
  as examples of the style this project aims for.

## Commit messages

This repo loosely follows [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`. Not strictly enforced, but
appreciated — it makes the changelog easier to generate later.

## Pull requests

- Keep PRs focused — one concern per PR is easier to review than a mixed
  bag of unrelated changes.
- Update `ARCHITECTURE.md` or the relevant guide under `docs/` if your
  change affects documented behavior.
- A maintainer will tag a release (`git tag vX.Y.Z`) once a PR is merged
  and ready to ship; this triggers the npm publish workflow in
  `.github/workflows/`.

## Questions?

Open a discussion or an issue — no need for a fully-formed proposal to
start a conversation.
