---
title: Relations
description: Declare and explicitly populate direct relations through batched queries.
navigation:
  icon: i-tabler-link
---

Relations are declared in table metadata and loaded explicitly with `populate`.

## Supported relations

::u-tabs
  :::u-tab{label="Many to one" icon="i-tabler-arrow-narrow-right"}
  A project belongs to one owner.

  ```ts
  {
    name: 'owner',
    kind: 'manyToOne',
    target: 'users',
    foreignKey: 'ownerId',
    references: 'id'
  }
  ```

  `references` defaults to `id`.
  :::

  :::u-tab{label="One to one" icon="i-tabler-arrows-right-left"}
  ```ts
  {
    name: 'profile',
    kind: 'oneToOne',
    target: 'profiles',
    foreignKey: 'profileId',
    references: 'id'
  }
  ```

  The foreign key is stored on the source entity.
  :::

  :::u-tab{label="One to many" icon="i-tabler-git-branch"}
  A user has many projects.

  ```ts
  {
    name: 'projects',
    kind: 'oneToMany',
    target: 'projects',
    foreignKey: 'ownerId',
    references: 'id'
  }
  ```

  `foreignKey` is a field on the target table. `references` identifies the source field.
  :::

  :::u-tab{label="Many to many" icon="i-tabler-topology-star-3"}
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

  The junction table must be registered and built by the adapter. `sourceKey` and `targetKey` default to `id`.
  :::
::

## Populate relations

::u-tabs
  :::u-tab{label="Many entities" icon="i-tabler-list"}
  ```ts
  const users = await engine.findMany('users', {
    populate: ['projects', 'teams']
  })
  ```
  :::

  :::u-tab{label="One entity" icon="i-tabler-user"}
  ```ts
  const user = await engine.findOne('users', {
    where: {
      conditions: [
        { field: 'id', operator: 'eq', value: userId }
      ]
    },
    populate: ['projects']
  })
  ```
  :::
::

Relations are attached using their metadata names.

::u-page-grid
  ::u-page-card{title="To-one" description="Returns the related entity or null." icon="i-tabler-user"}
  ::
  ::u-page-card{title="To-many" description="Returns an array, including an empty array when no match exists." icon="i-tabler-users"}
  ::
::

## Batch loading

::u-steps{level="3"}
### Collect source keys
The resolver extracts unique non-null key values from source entities.

### Load related records
Related rows are fetched using `IN` filters rather than one query per source entity.

### Group in memory
Results are indexed and attached to their matching source entities.
::

For many-to-many relations, the resolver first loads junction rows, then loads target rows, and finally groups them in memory.

::u-callout
---
icon: i-tabler-bolt
color: success
variant: subtle
title: No N+1 query per source entity
---
The resolver batches keys for each populated direct relation.
::

## Explicit loading

Relations are never populated automatically. This keeps query cost visible at the call site.

## Current boundaries

::u-accordion
  :::u-accordion-item{label="No nested paths" icon="i-tabler-sitemap-off"}
  Paths such as `projects.owner` are not currently supported.
  :::

  :::u-accordion-item{label="No relation query options" icon="i-tabler-adjustments-off"}
  Per-relation filters, ordering, pagination, and field projections are not available.
  :::

  :::u-accordion-item{label="Direct relations only" icon="i-tabler-link"}
  Each `populate` entry must match a relation declared directly on the source table.
  :::
::
