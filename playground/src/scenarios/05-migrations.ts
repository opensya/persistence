import assert from "node:assert/strict";
import {
  createMetadataRegistry,
  createQueryEngine,
  defineTable,
} from "@opensya/persistence";
import {
  agendasMetadata,
  auditLogsMetadata,
  outboxEventsMetadata,
  postsMetadata,
  usersMetadata,
} from "../metadata.js";
import { runScenario } from "./helpers.js";

const migrationRecordsMetadata = defineTable({
  name: "migrationRecords",
  collectionName: "playground_migration_records",
  columns: [
    {
      name: "id",
      columnName: "id",
      type: "uuid",
      nullable: false,
      primaryKey: true,
      unique: true,
      default: () => crypto.randomUUID(),
      validators: [],
    },
    {
      name: "label",
      columnName: "label",
      type: "string",
      nullable: false,
      primaryKey: false,
      unique: false,
      validators: [],
    },
  ],
  relations: [],
  tableValidators: [],
  indexes: [
    {
      name: "playground_migration_records_label_idx",
      fields: ["label"],
      unique: false,
    },
  ],
});

export async function migrationsScenario(): Promise<void> {
  await runScenario(
    "migration generation, planning and execution",
    async ({ adapter, engine }) => {
      const previous = engine.migrations.snapshot();
      const registry = createMetadataRegistry(
        usersMetadata,
        postsMetadata,
        agendasMetadata,
        auditLogsMetadata,
        outboxEventsMetadata,
        migrationRecordsMetadata,
      );
      registry.lock();
      const migrationEngine = createQueryEngine(registry, adapter);
      const migration = migrationEngine.migrations.generate({
        name: "add migration records",
        previous,
        createdAt: "2026-07-12T00:00:00.000Z",
      });

      assert.equal(migration.operations[0]?.kind, "createTable");
      assert.equal(migration.operations[1]?.kind, "createIndex");

      const dryRun = await migrationEngine.migrations.apply([migration], {
        dryRun: true,
      });
      assert.equal(dryRun.dryRun, true);
      assert.equal(dryRun.plan.migrations[0]?.statements.length, 2);

      const applied = await migrationEngine.migrations.apply([migration]);
      assert.deepEqual(applied.applied, [migration.id]);
      assert.deepEqual(applied.skipped, []);

      const status = await migrationEngine.migrations.status([migration]);
      assert.equal(status[0]?.status, "applied");

      const repeated = await migrationEngine.migrations.apply([migration]);
      assert.deepEqual(repeated.applied, []);
      assert.deepEqual(repeated.skipped, [migration.id]);

      const tables = await adapter.introspect();
      assert.ok(
        tables.some(
          (table) => table.collectionName === "playground_migration_records",
        ),
      );
    },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await migrationsScenario();
}
