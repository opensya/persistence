import assert from "node:assert/strict";
import test from "node:test";
import {
  AggregateQueriesNotSupportedError,
  createMetadataRegistry,
  createQueryEngine,
  defineTable,
  InvalidAggregateQueryError,
} from "../dist/index.js";

function createRegistry() {
  const orders = defineTable({
    name: "orders",
    collectionName: "orders",
    columns: [
      {
        name: "id",
        columnName: "id",
        type: "uuid",
        nullable: false,
        primaryKey: true,
        unique: true,
        validators: [],
      },
      {
        name: "status",
        columnName: "status",
        type: "string",
        nullable: false,
        primaryKey: false,
        unique: false,
        validators: [],
      },
      {
        name: "amount",
        columnName: "amount",
        type: "decimal",
        nullable: false,
        primaryKey: false,
        unique: false,
        validators: [],
      },
      {
        name: "secret",
        columnName: "secret",
        type: "string",
        nullable: false,
        primaryKey: false,
        unique: false,
        hidden: true,
        validators: [],
      },
    ],
    relations: [],
    tableValidators: [],
  });
  const registry = createMetadataRegistry(orders);
  registry.lock();
  return registry;
}

test("aggregate queries validate metadata and delegate to the adapter", async () => {
  let received;
  const adapter = {
    aggregate: async (table, query) => {
      received = { table, query };
      return [
        {
          status: "paid",
          orderCount: 2,
          revenue: "42.50",
          orderIds: ["order-1", "order-2"],
        },
      ];
    },
  };
  const engine = createQueryEngine({ registry: createRegistry(), adapter });
  const query = {
    groupBy: ["status"],
    metrics: {
      orderCount: { function: "count" },
      revenue: { function: "sum", field: "amount" },
      orderIds: { function: "collect", field: "id" },
    },
  };

  const rows = await engine.aggregate("orders", query);
  assert.deepEqual(rows, [
    {
      status: "paid",
      orderCount: 2,
      revenue: "42.50",
      orderIds: ["order-1", "order-2"],
    },
  ]);
  assert.deepEqual(received, { table: "orders", query });

  await assert.rejects(
    engine.aggregate("orders", {
      groupBy: ["secret"],
      metrics: { count: { function: "count" } },
    }),
    InvalidAggregateQueryError,
  );
  await assert.rejects(
    engine.aggregate("orders", {
      metrics: { total: { function: "sum", field: "status" } },
    }),
    InvalidAggregateQueryError,
  );
});

test("aggregate queries fail explicitly for unsupported adapters", async () => {
  const engine = createQueryEngine({ registry: createRegistry(), adapter: {} });
  await assert.rejects(
    engine.aggregate("orders", {
      metrics: { count: { function: "count" } },
    }),
    AggregateQueriesNotSupportedError,
  );
});
