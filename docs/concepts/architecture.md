# Architecture

OpenSya Persistence separates domain execution from database access.

## Runtime layers

```text
Application services
        |
        v
    QueryEngine
        |
        +-------------------+
        |                   |
        v                   v
 MetadataRegistry      HooksRegistry
        |
        v
 RelationResolver
        |
        v
 DatabaseAdapter
        |
        v
 Database implementation
```

## Metadata layer

The metadata layer describes the persistence model independently from the database adapter.

A `TableMetadata` contains:

- a logical name used by the engine;
- the physical collection or table name;
- column definitions;
- relation definitions;
- field validators;
- table validators.

The `MetadataRegistry` stores these definitions and validates their internal consistency before the application starts accepting requests.

## Query layer

The `QueryEngine` is the application-facing API. It coordinates:

- table lookup;
- reads and relation population;
- defaults;
- lifecycle hooks;
- structural and custom validation;
- transactions;
- safe mutations.

Application services should normally depend on the query engine instead of invoking the adapter directly.

## Adapter layer

The `DatabaseAdapter` interface is deliberately small:

- `findMany`
- `findOne`
- `insert`
- `update`
- `delete`
- `transaction`
- `buildTable`
- `introspect`

The built-in `DrizzleAdapter` translates generic filters and metadata into Drizzle PostgreSQL operations.

## Mutation pipeline

### Create

```text
transaction
  -> defaults
  -> beforeCreate
  -> field verification
  -> validation
  -> insert
  -> afterCreate
  -> commit
```

### Update

```text
safe-filter check
  -> transaction
  -> load current rows
  -> beforeUpdate
  -> merge current data and patch
  -> validate affected fields
  -> update
  -> afterUpdate
  -> commit
```

### Delete

```text
safe-filter check
  -> transaction
  -> beforeDelete
  -> delete
  -> afterDelete
  -> commit
```

An error thrown anywhere inside the callback is delegated to the adapter transaction implementation and should roll back the mutation.

## Logical and physical names

Persistence distinguishes between:

- `TableMetadata.name`: the logical identifier passed to `QueryEngine`;
- `TableMetadata.collectionName`: the physical PostgreSQL table name;
- `ColumnMetadata.name`: the logical field name used in entities and filters;
- `ColumnMetadata.columnName`: the physical database column name.

This separation allows application naming to remain stable even when database naming conventions differ.

## Dependency direction

The engine depends on interfaces and metadata, not on Drizzle-specific types. Database-specific behavior belongs inside an adapter.

A custom adapter should preserve the safety guarantees of the built-in adapter, especially:

- rejecting empty update and delete filters;
- validating referenced fields;
- executing mutation callbacks transactionally;
- returning inserted and updated rows consistently.
