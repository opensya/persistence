---
title: Relations
description: Declare direct relationships and load them explicitly in batches.
navigation:
  icon: i-tabler-link
---

Relations belong to metadata. They do not create PostgreSQL foreign keys and are only loaded when requested through `populate`.

## Many to one

```ts
{
  name: 'owner',
  kind: 'manyToOne',
  target: 'users',
  foreignKey: 'ownerId',
  references: 'id'
}
```

The source entity stores `ownerId`. The resolver collects those values and loads matching target rows.

## One to one

```ts
{
  name: 'profile',
  kind: 'oneToOne',
  target: 'profiles',
  foreignKey: 'profileId',
  references: 'id'
}
```

Resolution is the same as many-to-one, but the metadata expresses a different domain cardinality.

## One to many

```ts
{
  name: 'projects',
  kind: 'oneToMany',
  target: 'projects',
  foreignKey: 'ownerId',
  references: 'id'
}
```

The resolver collects source `id` values, loads targets whose `ownerId` is in that set, then groups rows by foreign key.

## Many to many

```ts
{
  name: 'teams',
  kind: 'manyToMany',
  target: 'teams',
  through: {
    table: 'teamMembers',
    sourceForeignKey: 'userId',
    targetForeignKey: 'teamId'
  },
  sourceKey: 'id',
  targetKey: 'id'
}
```

The junction table must be registered and built like every other table.

::u-steps{level="3"}
### Load matching junction rows
### Collect unique target foreign-key values
### Load target rows in one query
### Index targets and junction rows in memory
### Attach ordered related arrays to source entities
::

## Populate

```ts
const users = await engine.findMany<UserWithProjects>('users', {
  populate: ['projects', 'teams']
})
```

For `findOne()`, the same `populate` option applies after loading the base entity.

- to-one relations resolve to an entity or `null`;
- to-many relations resolve to an array;
- missing relation names throw;
- duplicate keys are deduplicated before related queries.

## Query behavior

Each populated relation results in batched adapter queries, not one query per source entity. Many-to-many requires one junction query and one target query.

::u-callout
---
icon: i-tabler-eye
color: info
variant: subtle
---
Population is explicit so callers can see when a query will perform additional database work.
::

## Current scope

The resolver does not currently support:

- nested paths such as `projects.owner`;
- filters or sorting per populated relation;
- relation-specific pagination;
- field projections;
- automatic recursive loading.

PostgreSQL introspection also returns `relations: []`; declared relation metadata remains the source of truth.
