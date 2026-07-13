---
title: Aggregate queries
description: Count, summarize and group persisted data through the Query Engine.
navigation:
  icon: i-tabler-chart-histogram
---

Aggregate queries compute summaries in the database without loading every
entity into application memory. The API is adapter-neutral; `PostgreAdapter`
translates it into native aggregate SQL.

## Global metrics

```ts
const [summary] = await engine.aggregate('orders', {
  where: {
    conditions: [{ field: 'status', operator: 'eq', value: 'paid' }]
  },
  metrics: {
    orderCount: { function: 'count' },
    revenue: { function: 'sum', field: 'amount' },
    averageOrder: { function: 'avg', field: 'amount' },
    smallestOrder: { function: 'min', field: 'amount' },
    largestOrder: { function: 'max', field: 'amount' }
  }
})
```

Omitting the field from `count` produces `COUNT(*)`. The other functions
require a field. `sum` and `avg` accept only `integer`, `bigint` and `decimal`
metadata fields.

The method always returns an array. Without `groupBy`, it normally contains a
single summary row. Aggregate numeric values may be numbers, bigints or strings
depending on the database type and adapter, so applications should narrow or
convert them deliberately.

## Group results

```ts
const rows = await engine.aggregate('orders', {
  groupBy: ['status'],
  metrics: {
    orderCount: { function: 'count' },
    revenue: { function: 'sum', field: 'amount' }
  }
})
```

Each result includes the logical grouping fields alongside the requested
metric aliases:

```ts
[
  { status: 'paid', orderCount: 12, revenue: '540.50' },
  { status: 'pending', orderCount: 3, revenue: '75.00' }
]
```

Filters use the same `QueryFilter` structure as `findMany()`.

## Validation and visibility

Persistence validates group fields, metric fields, aliases and numeric
operations before calling the adapter. Fields declared with `hidden` or
dynamic `visibility` cannot be grouped or aggregated because aggregate rows do
not represent individual entities on which visibility resolvers could run.

Adapters without native aggregate support fail explicitly with
`AggregateQueriesNotSupportedError`.
