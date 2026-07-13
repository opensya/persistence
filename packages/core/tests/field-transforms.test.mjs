import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetadataRegistry,
  createQueryEngine,
  defineTable,
} from "../dist/index.js";

function createAdapter() {
  let row = null;
  return {
    get row() {
      return row;
    },
    findMany: async () => (row ? [row] : []),
    findOne: async () => row,
    insert: async (_table, data) => {
      row = { ...data };
      return row;
    },
    update: async (_table, _where, patch) => {
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

function createEngine(adapter, transformations) {
  const users = defineTable({
    name: "users",
    collectionName: "users",
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
        name: "password",
        columnName: "password_hash",
        type: "string",
        nullable: false,
        primaryKey: false,
        unique: false,
        hidden: true,
        validators: [
          {
            name: "plain-password",
            validate(value) {
              return typeof value === "string" && !value.startsWith("hashed:")
                ? { valid: true }
                : { valid: false, message: "Expected a plain password." };
            },
          },
        ],
        async transform(value, context) {
          transformations.push({ value, context });
          return `hashed:${value}`;
        },
      },
      {
        name: "displayName",
        columnName: "display_name",
        type: "string",
        nullable: false,
        primaryKey: false,
        unique: false,
        validators: [],
      },
    ],
    relations: [],
    tableValidators: [],
  });
  const registry = createMetadataRegistry(users);
  registry.lock();
  return createQueryEngine({ registry, adapter });
}

test("field transforms run after validation and before create/update writes", async () => {
  const adapter = createAdapter();
  const transformations = [];
  const engine = createEngine(adapter, transformations);

  await engine.create(
    "users",
    { id: "user-1", password: "plain-secret", displayName: "Ada" },
    { tenantId: "tenant-1" },
  );

  const publicUser = await engine.findOne("users", {
    where: { conditions: [{ field: "id", operator: "eq", value: "user-1" }] },
  });
  assert.equal("password" in publicUser, false);

  const internalUser = await engine.internal.findOne("users", {
    where: { conditions: [{ field: "id", operator: "eq", value: "user-1" }] },
  });
  assert.equal(internalUser.password, "hashed:plain-secret");

  const internalUsers = await engine.internal.findMany("users");
  assert.equal(internalUsers[0].password, "hashed:plain-secret");

  assert.equal(adapter.row.password, "hashed:plain-secret");
  assert.equal(transformations[0].context.operation, "create");
  assert.equal(transformations[0].context.tenantId, "tenant-1");

  await engine.updateOne(
    "users",
    { conditions: [{ field: "id", operator: "eq", value: "user-1" }] },
    { displayName: "Grace" },
  );
  assert.equal(transformations.length, 1);
  assert.equal(adapter.row.password, "hashed:plain-secret");

  await engine.updateOne(
    "users",
    { conditions: [{ field: "id", operator: "eq", value: "user-1" }] },
    { password: "new-secret" },
  );
  assert.equal(transformations[1].context.operation, "update");
  assert.equal(adapter.row.password, "hashed:new-secret");
});
