# Queries and filters

Persistence uses a database-independent filter tree.

## Conditions

A condition contains a field, operator, and optional value:

```ts
{
  field: "status",
  operator: "eq",
  value: "active",
}
```

Supported operators:

| Operator | Meaning | Expected value |
| --- | --- | --- |
| `eq` | equals | scalar |
| `ne` | not equal | scalar |
| `in` | included in a collection | non-empty array |
| `notIn` | excluded from a collection | non-empty array |
| `gt` | greater than | comparable value |
| `gte` | greater than or equal | comparable value |
| `lt` | less than | comparable value |
| `lte` | less than or equal | comparable value |
| `isNull` | null check | `true` or omitted for null; `false` for not null |

## Simple filters

```ts
const activeUsers = await engine.findMany("users", {
  where: {
    conditions: [
      { field: "active", operator: "eq", value: true },
    ],
  },
});
```

Multiple conditions in the same filter are combined with `AND`.

## Nested filters

Filters support `and`, `or`, and `not` groups:

```ts
const users = await engine.findMany("users", {
  where: {
    and: [
      {
        conditions: [
          { field: "active", operator: "eq", value: true },
        ],
      },
      {
        or: [
          {
            conditions: [
              { field: "role", operator: "eq", value: "admin" },
            ],
          },
          {
            conditions: [
              { field: "role", operator: "eq", value: "owner" },
            ],
          },
        ],
      },
    ],
  },
});
```

Negation:

```ts
const users = await engine.findMany("users", {
  where: {
    not: {
      conditions: [
        { field: "status", operator: "eq", value: "disabled" },
      ],
    },
  },
});
```

## IN operators

`in` and `notIn` require a non-empty array:

```ts
{
  conditions: [
    {
      field: "id",
      operator: "in",
      value: ["id-1", "id-2"],
    },
  ],
}
```

An empty or non-array value is rejected.

## Null checks

```ts
// IS NULL
{ field: "deletedAt", operator: "isNull", value: true }

// IS NOT NULL
{ field: "deletedAt", operator: "isNull", value: false }
```

## Ordering and pagination

```ts
const page = await engine.findMany("users", {
  orderBy: [
    { field: "createdAt", direction: "desc" },
    { field: "email", direction: "asc" },
  ],
  limit: 20,
  offset: 40,
});
```

Negative limits and offsets are rejected. A limit of zero is accepted.

## Safe mutations

Every update and delete requires a filter containing at least one effective condition:

```ts
await engine.updateMany(
  "users",
  {
    conditions: [
      { field: "status", operator: "eq", value: "pending" },
    ],
  },
  {
    status: "active",
  },
);
```

The following is rejected:

```ts
await engine.deleteMany("users", {});
```

It throws `UnsafeMutationError`. The built-in Drizzle adapter applies the same safety check when used directly.

## Field verification

The Drizzle adapter verifies fields used by filters, ordering, inserts, and updates. Unknown fields produce an error before the query is executed.
