import assert from "node:assert/strict";
import { runScenario } from "./helpers.js";

export async function schemaCreationScenario(): Promise<void> {
  await runScenario("metadata-driven schema creation", async (playground) => {
    assert.equal(playground.schemaCreation.created.length, 5);
    assert.equal(playground.schemaCreation.skipped.length, 0);

    const repeated = await playground.engine.schema.createTables();
    assert.equal(repeated.created.length, 0);
    assert.equal(repeated.skipped.length, 5);

    const introspected = await playground.adapter.introspect();
    const tableNames = new Set(
      introspected.map((table) => table.collectionName),
    );
    for (const table of [
      "playground_users",
      "playground_posts",
      "playground_agendas",
      "playground_audit_logs",
      "playground_outbox_events",
    ]) {
      assert.ok(tableNames.has(table), `Expected table "${table}" to exist.`);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await schemaCreationScenario();
}
