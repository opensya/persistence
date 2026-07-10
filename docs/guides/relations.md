# Relations

Relations are declared in table metadata and loaded explicitly with `populate`.

## Supported relation kinds

- `manyToOne`
- `oneToOne`
- `oneToMany`
- `manyToMany`

## Many-to-one

A project belongs to one owner:

```ts
{
  name: "owner",
  kind: "manyToOne",
  target: "users",
  foreignKey: "ownerId",
  references: "id",
}
```

`references` defaults to `id`.

## One-to-one

```ts
{
  name: "profile",
  kind: "oneToOne",
  target: "profiles",
  foreignKey: "profileId",
  references: "id",
}
```

Many-to-one and one-to-one relations are resolved using the foreign key stored on the source entity.

## One-to-many

A user has many projects:

```ts
{
  name: "projects",
  kind: "oneToMany",
  target: "projects",
  foreignKey: "ownerId",
  references: "id",
}
```

For one-to-many relations, `foreignKey` is a field on the target table. `references` identifies the source field and defaults to `id`.

## Many-to-many

```ts
{
  name: "teams",
  kind: "manyToMany",
  target: "teams",

  through: {
    table: "teamMembers",
    sourceForeignKey: "userId",
    targetForeignKey: "teamId",
  },

  sourceKey: "id",
  targetKey: "id",
}
```

`sourceKey` and `targetKey` default to `id`. The junction table must also be registered in the metadata registry and built by the adapter.

## Populating relations

```ts
const users = await engine.findMany("users", {
  populate: ["projects", "teams"],
});
```

For a single entity:

```ts
const user = await engine.findOne("users", {
  where: {
    conditions: [{ field: "id", operator: "eq", value: userId }],
  },
  populate: ["projects"],
});
```

Relations are attached using their metadata name.

- to-one relations return an entity or `null`;
- to-many relations return an array.

## Batch loading

The relation resolver collects foreign-key values and loads related records with `IN` queries. It does not execute one query per source entity.

For a many-to-many relation, it executes:

1. one query for matching junction rows;
2. one query for matching target rows;
3. in-memory grouping.

## Explicit loading

Relations are never populated automatically. This keeps query cost visible at the call site.

## Current boundaries

The current resolver supports direct relation names only. Nested paths such as `projects.owner` are not implemented. Per-relation filtering, sorting, pagination, and field projection are also not currently available.
