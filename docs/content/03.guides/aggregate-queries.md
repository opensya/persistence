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
    largestOrder: { function: 'max', field: 'amount' },
    orderIds: { function: 'collect', field: 'id' }
  }
})
```

Omitting the field from `count` produces `COUNT(*)`. The other functions
require a field. `sum` and `avg` accept only `integer`, `bigint` and `decimal`
metadata fields. `collect` gathers the selected field from every matching row
into an array.
The order of collected values is not guaranteed.

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
    revenue: { function: 'sum', field: 'amount' },
    users: { function: 'collect', field: 'id' }
  }
})
```

Each result includes the logical grouping fields alongside the requested
metric aliases:

```ts
[
  {
    status: 'paid',
    orderCount: 2,
    revenue: '540.50',
    users: ['order-1', 'order-2']
  },
  {
    status: 'pending',
    orderCount: 1,
    revenue: '75.00',
    users: ['order-3']
  }
]
```

The metric alias is arbitrary. In this example the `users` property contains
the `id` value of every order in the corresponding status group. A more
descriptive alias such as `orderIds` can be used in the same way:

```ts
orderIds: { function: 'collect', field: 'id' }
```

Filters use the same `QueryFilter` structure as `findMany()`.

## Validation and visibility

Persistence validates group fields, metric fields, aliases and numeric
operations before calling the adapter. Fields declared with `hidden` or
dynamic `visibility` cannot be grouped or aggregated because aggregate rows do
not represent individual entities on which visibility resolvers could run.

Adapters without native aggregate support fail explicitly with
`AggregateQueriesNotSupportedError`.
