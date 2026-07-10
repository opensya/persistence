---
title: Queries and filters
description: Compose database-independent constraints, sorting, and pagination.
navigation:
  icon: i-tabler-filter
---

Queries use logical metadata field names. The adapter validates those fields before translating the query.

## Query parameters

```ts
interface QueryParams {
  where?: QueryFilter
  limit?: number
  offset?: number
  orderBy?: {
    field: string
    direction: 'asc' | 'desc'
  }[]
}
```

The Query Engine adds `populate?: string[]` for explicit relation loading.

## Conditions

```ts
interface FilterCondition {
  field: string
  operator: FilterOperator
  value?: unknown
}
```

| Operator | Translation | Value |
| --- | --- | --- |
| `eq` | equals | scalar |
| `ne` | not equal | scalar |
| `in` | in array | non-empty array |
| `notIn` | not in array | non-empty array |
| `gt`, `gte` | greater comparisons | comparable |
| `lt`, `lte` | lower comparisons | comparable |
| `isNull` | null check | `false` means IS NOT NULL; otherwise IS NULL |

Conditions declared together are combined with `AND`.

```ts
const activeAdmins = await engine.findMany<User>('users', {
  where: {
    conditions: [
      { field: 'active', operator: 'eq', value: true },
      { field: 'role', operator: 'eq', value: 'admin' }
    ]
  }
})
```

## Boolean groups

```ts
const users = await engine.findMany<User>('users', {
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
    ],
    not: {
      conditions: [
        { field: 'status', operator: 'eq', value: 'suspended' }
      ]
    }
  }
})
```

Nested `and`, `or`, and `not` groups compile recursively.

## Collection operators

```ts
{
  conditions: [
    {
      field: 'id',
      operator: 'in',
      value: ['user-1', 'user-2']
    }
  ]
}
```

::u-callout
---
icon: i-tabler-alert-triangle
color: warning
variant: subtle
---
`in` and `notIn` require arrays containing at least one value. Invalid inputs are rejected before SQL execution.
::

## Null checks

```ts
// IS NULL
{ field: 'deletedAt', operator: 'isNull' }

// IS NOT NULL
{ field: 'deletedAt', operator: 'isNull', value: false }
```

## Sorting and pagination

```ts
const page = await engine.findMany<User>('users', {
  orderBy: [
    { field: 'createdAt', direction: 'desc' },
    { field: 'email', direction: 'asc' }
  ],
  limit: 25,
  offset: 50
})
```

A limit or offset below zero is rejected. `limit: 0` is valid.

## Reusable filters

```ts
import type { QueryFilter } from '@opensya/persistence'

export function byId(id: string): QueryFilter {
  return {
    conditions: [
      { field: 'id', operator: 'eq', value: id }
    ]
  }
}
```

## Safe mutations

`hasFilterConstraints()` recursively checks whether a filter contains an actual condition. Update and delete operations reject ineffective filters at both engine and adapter levels.

```ts
await engine.updateMany('users', {}, { active: false })
// UnsafeMutationError
```

::u-callout
---
icon: i-tabler-shield-check
color: success
variant: subtle
---
An empty `conditions` array, empty nested groups, or a `not` containing no condition does not count as a safe filter.
::
