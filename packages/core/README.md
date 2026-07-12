<br />
<p align="center">
  <a href="https://persistence.opensya.com/" target="_blank"><img src="https://raw.githubusercontent.com/opensya/persistence/main/.github/assets/logo.svg" width="120" alt="OpenSya Persistence Logo" /></a>
</p>

<h1 align="center">
OpenSya Persistence
</h1>

<p align="center">A metadata-driven persistence engine for TypeScript applications, powering <a href="https://opensya.com" target="_blank">OpenSya</a>.</p>
<br />

## Description

OpenSya Persistence gives TypeScript applications a consistent runtime for executing domain rules around data.

It handles type inference, validation, relations, lifecycle hooks, transactions, audit logs and domain events while remaining framework-agnostic and independent from the underlying database.

OpenSya Persistence powers OpenSya, but can be used in any JavaScript or TypeScript application.

## Philosophy

- **Define once**

Metadata is the source of truth for types, validation, relations and runtime behavior.

- **Execute consistently**

Every operation follows the same domain rules, regardless of where it is executed.

- **Stay in control**

Persistence works above the database adapter. Use Drizzle today, or provide your own adapter tomorrow.

## Features

- Metadata-driven, strongly typed entities
- Database-independent Query Engine
- Validation and lifecycle hooks
- Explicit relation population
- Safe transactional mutations
- Field visibility and serialization
- Transactional audit logs and domain events
- Stable cursor pagination
- Drizzle PostgreSQL adapter

---

- Documentation **https://persistence.opensya.com**
- License [MIT licensed](LICENSE).
