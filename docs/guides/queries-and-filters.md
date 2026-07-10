---
title: Queries and filters
description: Build database-independent filters, ordering, pagination, and safe mutations.
navigation:
  icon: i-tabler-filter
---

Persistence represents query constraints as a database-independent filter tree.

## Filter anatomy

```ts
{
  field: 'status',
  operator: 'eq',
  value: 'active'
}
```

A condition contains a logical metadata field, an operator, and an optional value.

## Operators

| Operator | Meaning | Expected value |
| --- | --- | --- |
| `eq` | Equals | Scalar |
| `ne` | Not equal | Scalar |
| `in` | Included in a collection | Non-empty array |
| `notIn` | Excluded from a collection | Non-empty array |
| `gt` | Greater than | Comparable value |
| `gte` | Greater than or equal | Comparable value |
| `lt` | Less than | Comparable value |
| `lte` | Less than or equal | Comparable value |
| `isNull` | Null or not-null check | Boolean or omitted |

## Common filters

::u-tabs
  :::u-tab{label="Equality" icon="i-tabler-equal"}
  ```ts
  const users = await engine.findMany('users', {
    where: {
      conditions: [
        { field: 'active', operator: 'eq', value: true },
        { field: 'role', operator: 'ne', value: 'guest' }
      ]
    }
  })
  ```

  Conditions in the same filter are combined with `AND`.
  :::

  :::u-tab{label="Collections" icon="i-tabler-list"}
  ```ts
  const users = await engine.findMany('users', {
    where: {
      conditions: [
        {
          field: 'id',
          operator: 'in',
          value: ['id-1', 'id-2']
        }
      ]
    }
  })
  ```

  `in` and `notIn` reject empty arrays and non-array values.
  :::

  :::u-tab{label="Comparison" icon="i-tabler-arrows-sort"}
  ```ts
  const recent = await engine.findMany('events', {
    where: {
      conditions: [
        {
          field: 'createdAt',
          operator: 'gte',
          value: startDate
        }
      ]
    }
  })
  ```
  :::

  :::u-tab{label="Null" icon="i-tabler-circle-off"}
  ```ts
  // IS NULL
  { field: 'deletedAt', operator: 'isNull', value: true }

  // IS NOT NULL
  { field: 'deletedAt', operator: 'isNull', value: false }
  ```
  :::
::

## Nested boolean logic

::u-tabs
  :::u-tab{label="AND + OR" icon="i-tabler-binary-tree"}
  ```ts
  const users = await engine.findMany('users', {
    where: {
      and: [
        {
          conditions: [
            { field: 'active', operator: 'eq', value: true }
          ]
        },
        {
          or: [
            {
              conditions: [
                { field: 'role', operator: 'eq', value: 'admin' }
              ]
            },
            {
              conditions: [
                { field: 'role', operator: 'eq', value: 'owner' }
              ]
            }
          ]
        }
      ]
    }
  })
  ```
  :::

  :::u-tab{label="NOT" icon="i-tabler-circle-minus"}
  ```ts
  const users = await engine.findMany('users', {
    where: {
      not: {
        conditions: [
          {
            field: 'status',
            operator: 'eq',
            value: 'disabled'
          }
        ]
      }
    }
  })
  ```
  :::
::

## Ordering and pagination

```ts
const page = await engine.findMany('users', {
  orderBy: [
    { field: 'createdAt', direction: 'desc' },
    { field: 'email', direction: 'asc' }
  ],
  limit: 20,
  offset: 40
})
```

::u-page-grid
  ::u-page-card{title="orderBy" description="Apply one or more ascending or descending field orders." icon="i-tabler-arrows-sort"}
  ::
  ::u-page-card{title="limit" description="Restrict the number of returned rows. Zero is valid." icon="i-tabler-list-numbers"}
  ::
  ::u-page-card{title="offset" description="Skip rows for offset-based pagination." icon="i-tabler-arrow-bar-to-right"}
  ::
::

Negative limits and offsets are rejected.

## Safe mutations

```ts
await engine.updateMany(
  'users',
  {
    conditions: [
      { field: 'status', operator: 'eq', value: 'pending' }
    ]
  },
  {
    status: 'active'
  }
)
```

::u-callout
---
icon: i-tabler-shield-x
color: error
variant: subtle
title: Empty filters are rejected
---
Calling `updateOne()`, `updateMany()`, `deleteOne()`, or `deleteMany()` with an empty filter throws `UnsafeMutationError`.
::

```ts
// Rejected before reaching the database
await engine.deleteMany('users', {})
```

## Field verification

The built-in Drizzle adapter verifies fields used by:

::u-page-grid
  ::u-page-card{title="Filters" icon="i-tabler-filter" description="Every condition must target a built field."}
  ::
  ::u-page-card{title="Ordering" icon="i-tabler-arrows-sort" description="Every orderBy field must exist."}
  ::
  ::u-page-card{title="Inserts" icon="i-tabler-database-plus" description="Unknown data fields are rejected."}
  ::
  ::u-page-card{title="Updates" icon="i-tabler-database-edit" description="Unknown patch fields are rejected."}
  ::
::
