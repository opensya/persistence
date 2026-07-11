---
title: Cursor pagination
description: Page through changing datasets with stable keyset filters.
navigation:
  icon: i-tabler-arrow-bar-to-down
---

`findPage()` uses keyset pagination instead of increasing SQL offsets. It stays
stable and efficient as tables grow.

## First page

```ts
const page = await engine.findPage('applications', {
  first: 20,
  where: {
    conditions: [
      { field: 'jobId', operator: 'eq', value: jobId }
    ]
  },
  orderBy: [{ field: 'createdAt', direction: 'desc' }]
})
```

```ts
interface CursorPage<T> {
  data: T[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
}
```

## Next page

```ts
const next = await engine.findPage('applications', {
  first: 20,
  after: page.pageInfo.endCursor!,
  where,
  orderBy: [{ field: 'createdAt', direction: 'desc' }]
})
```

Use the same filter and ordering for every page. The cursor is opaque and
URL-safe; applications should pass it back unchanged.

## Deterministic ordering

Persistence automatically appends missing primary-key fields to `orderBy`.
Rows sharing the same `createdAt` therefore remain uniquely ordered.

The cursor contains the effective order signature. Reusing it with another sort
raises `InvalidCursorError`.

## Boundaries

- `first` defaults to 50 and must be between 1 and 100;
- ascending and descending compound orders are supported;
- `Date` and `bigint` cursor values are encoded safely;
- `where`, `populate` and field serialization remain available;
- ordering values used to create a cursor must not be `null` or `undefined`.

::callout
---
icon: i-tabler-database-search
color: neutral
variant: subtle
---
Create a database index that starts with frequently filtered and ordered fields.
Cursor pagination avoids `OFFSET`, but it still depends on appropriate indexes.
::
