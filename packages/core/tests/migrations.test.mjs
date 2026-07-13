import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetadataRegistry,
  createPostgreAdapter,
  createSchemaSnapshot,
  DestructiveMigrationError,
  diffSchemaSnapshots,
  MigrationManager,
  parseMigration,
  serializeMigration,
} from "../dist/index.js";

function table(columns) {
  return {
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
      ...columns,
    ],
    relations: [],
    tableValidators: [],
  };
}

function registry(metadata) {
  const value = createMetadataRegistry(metadata);
  value.lock();
  return value;
}

test("migration generation is deterministic", () => {
  const metadata = table([
    {
      name: "email",
      columnName: "email",
      type: "string",
      nullable: false,
      primaryKey: false,
      unique: true,
      validators: [],
    },
  ]);
  const manager = new MigrationManager(registry(metadata), {});
  const first = manager.generate({
    name: "create users",
    createdAt: "2026-07-12T00:00:00.000Z",
  });
  const second = manager.generate({
    name: "create users",
    createdAt: "2026-07-13T00:00:00.000Z",
  });

  assert.equal(first.id, second.id);
  assert.equal(first.checksum, second.checksum);
  assert.deepEqual(first.operations, second.operations);
  assert.equal(first.operations[0]?.kind, "createTable");
  assert.deepEqual(parseMigration(serializeMigration(first)), first);
});

test("safe and irreversible changes are classified", () => {
  const previous = createSchemaSnapshot(registry(table([])));
  const withNullableColumn = createSchemaSnapshot(
    registry(
      table([
        {
          name: "nickname",
          columnName: "nickname",
          type: "string",
          nullable: true,
          primaryKey: false,
          unique: false,
          validators: [],
        },
      ]),
    ),
  );
  const added = diffSchemaSnapshots(previous, withNullableColumn);
  assert.equal(added[0]?.kind, "addColumn");
  assert.equal(added[0]?.safety, "safe");

  const removed = diffSchemaSnapshots(withNullableColumn, previous);
  assert.equal(removed[0]?.kind, "dropColumn");
  assert.equal(removed[0]?.safety, "irreversible");
});

test("destructive plans require explicit approval", async () => {
  const previous = createSchemaSnapshot(
    registry(
      table([
        {
          name: "legacy",
          columnName: "legacy",
          type: "string",
          nullable: true,
          primaryKey: false,
          unique: false,
          validators: [],
        },
      ]),
    ),
  );
  const manager = new MigrationManager(
    registry(table([])),
    createPostgreAdapter({}),
  );
  const migration = manager.generate({ name: "drop legacy", previous });
  const dryRun = await manager.apply([migration], { dryRun: true });

  assert.equal(dryRun.plan.irreversible, true);
  assert.match(
    dryRun.plan.migrations[0]?.statements[0] ?? "",
    /DROP COLUMN "legacy"/,
  );
  await assert.rejects(
    manager.apply([migration]),
    DestructiveMigrationError,
  );
});
