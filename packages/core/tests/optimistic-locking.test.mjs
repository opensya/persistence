import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetadataRegistry,
  createQueryEngine,
  defineTable,
  OptimisticLockError,
  OptimisticLockVersionRequiredError,
} from "../dist/index.js";

function matches(filter, entity) {
  if (!filter) return true;
  const conditions = filter.conditions ?? [];
  if (
    !conditions.every(({ field, operator, value }) =>
      operator === "eq" ? entity[field] === value : false,
    )
  ) {
    return false;
  }
  if (filter.and && !filter.and.every((item) => matches(item, entity))) {
    return false;
  }
  return true;
}

function createAdapter() {
  let row = null;
  return {
    get row() {
      return row;
    },
    findMany: async (_table, params) =>
      row && matches(params?.where, row) ? [row] : [],
    findOne: async (_table, params) =>
      row && matches(params?.where, row) ? row : null,
    insert: async (_table, data) => {
      row = { ...data };
      return row;
    },
    update: async (_table, where, patch) => {
      if (!row || !matches(where, row)) return [];
      row = { ...row, ...patch };
      return [row];
    },
    delete: async () => 0,
    transaction(callback) {
      return callback(this);
    },
    buildTable: () => undefined,
    introspect: async () => [],
  };
}

function createEngine(adapter) {
  const documents = defineTable({
    name: "documents",
    collectionName: "documents",
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
        name: "title",
        columnName: "title",
        type: "string",
        nullable: false,
        primaryKey: false,
        unique: false,
        validators: [],
      },
      {
        name: "version",
        columnName: "version",
        type: "integer",
        nullable: false,
        primaryKey: false,
        unique: false,
        default: 1,
        validators: [],
      },
    ],
    relations: [],
    tableValidators: [],
    optimisticLock: { field: "version" },
  });
  const registry = createMetadataRegistry(documents);
  registry.lock();
  return createQueryEngine({ registry, adapter });
}

test("optimistic locking increments versions and rejects stale updates", async () => {
  const adapter = createAdapter();
  const engine = createEngine(adapter);

  const created = await engine.create("documents", {
    id: "document-1",
    title: "First",
    version: 99,
  });
  assert.equal(created.version, 1);

  const updated = await engine.updateOne(
    "documents",
    { conditions: [{ field: "id", operator: "eq", value: "document-1" }] },
    { title: "Second", version: 1 },
  );
  assert.equal(updated.version, 2);
  assert.equal(adapter.row.version, 2);

  await assert.rejects(
    engine.updateOne(
      "documents",
      { conditions: [{ field: "id", operator: "eq", value: "document-1" }] },
      { title: "Stale", version: 1 },
    ),
    OptimisticLockError,
  );
  assert.equal(adapter.row.title, "Second");

  await assert.rejects(
    engine.updateOne(
      "documents",
      { conditions: [{ field: "id", operator: "eq", value: "document-1" }] },
      { title: "Missing version" },
    ),
    OptimisticLockVersionRequiredError,
  );
});

test("registry rejects invalid optimistic lock fields", () => {
  const invalid = defineTable({
    name: "invalid",
    collectionName: "invalid",
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
    ],
    relations: [],
    tableValidators: [],
    optimisticLock: { field: "version" },
  });

  assert.throws(
    () => createMetadataRegistry(invalid).lock(),
    /unknown field "version"/,
  );
});
