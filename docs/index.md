# OpenSya Persistence

OpenSya Persistence is a metadata-driven persistence engine for TypeScript applications.

It sits between application code and the database adapter and provides a consistent runtime for domain-oriented data operations: validation, lifecycle hooks, relation loading, transactions, and safe mutations.

```text
Application
    |
    v
Query Engine
    |
    +-- Metadata Registry
    +-- Validators
    +-- Lifecycle Hooks
    +-- Relation Resolver
    |
    v
Database Adapter
    |
    v
Database
```

Persistence does not replace an ORM. The ORM remains responsible for communicating with the database. Persistence coordinates the rules that must run around database operations.

## Core principles

### Metadata is the source of truth

Tables, columns, validation rules, and relations are described using `TableMetadata`. The same metadata is used by the registry, query engine, relation resolver, and adapter.

### Domain operations are executed consistently

Create, update, and delete operations go through a predictable pipeline:

1. start a transaction;
2. apply defaults;
3. execute before hooks;
4. validate the entity;
5. execute the database mutation;
6. execute after hooks;
7. commit or roll back the transaction.

### Mutations are safe by default

Update and delete operations require a non-empty filter. Accidental unbounded mutations are rejected with `UnsafeMutationError`.

### The database is behind an adapter

The query engine depends on the `DatabaseAdapter` interface rather than a specific database library. A PostgreSQL adapter powered by Drizzle is currently included.

## Main components

| Component | Responsibility |
| --- | --- |
| `MetadataRegistry` | Registers, validates, and locks the application schema |
| `QueryEngine` | Executes reads and transactional mutations |
| `HooksRegistry` | Registers and runs lifecycle hooks |
| `RelationResolver` | Loads declared relations in batches |
| `DatabaseAdapter` | Defines the database-independent persistence contract |
| `DrizzleAdapter` | Implements the contract with Drizzle and PostgreSQL |
| `ConsistencyChecker` | Compares declared metadata with an introspected schema |

## Documentation

Start with [Getting started](./getting-started.md), then explore the [architecture](./concepts/architecture.md) and the focused guides in the [documentation summary](./SUMMARY.md).

## Project status

OpenSya Persistence is currently at version `0.0.1`. Its public API is usable, but some capabilities remain under development. Review [Current limitations](./current-limitations.md) before using it in production.
