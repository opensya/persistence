import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createMetadataRegistry } from "../src/metadata/registry.js";
import type { TableMetadata } from "../src/metadata/types.js";
import { createDrizzleAdapter } from "../src/adapter/drizzle-adapter.js";
import { createQueryEngine } from "../src/query-engine/engine.js";
import { ValidationError } from "../src/query-engine/types.js";

async function main() {
  const events: TableMetadata = {
    name: "events",
    collectionName: "events",
    columns: [
      {
        name: "id",
        columnName: "id",
        type: "string",
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
        validators: [
          {
            name: "title-not-empty",
            validate: (value) => {
              const ok = typeof value === "string" && value.trim().length > 0;
              return ok
                ? { valid: true }
                : { valid: false, message: "le titre ne peut pas être vide" };
            },
          },
        ],
      },
      {
        name: "startDate",
        columnName: "start_date",
        type: "timestamp",
        nullable: false,
        primaryKey: false,
        unique: false,
        validators: [],
      },
      {
        name: "endDate",
        columnName: "end_date",
        type: "timestamp",
        nullable: false,
        primaryKey: false,
        unique: false,
        validators: [],
      },
    ],
    relations: [],
    tableValidators: [
      {
        name: "end-after-start",
        fields: ["startDate", "endDate"],
        validate: (entity) => {
          const start = new Date(entity.startDate as string);
          const end = new Date(entity.endDate as string);
          return end > start
            ? { valid: true }
            : { valid: false, message: "endDate doit être après startDate" };
        },
      },
    ],
  };

  const registry = createMetadataRegistry();
  registry.register(events);
  registry.lock();

  const pool = new Pool({
    connectionString:
      "postgres://postgres:postgres@127.0.0.1:5432/opensya_test",
  });
  const db = drizzle({ client: pool });
  const adapter = createDrizzleAdapter(db);
  adapter.buildTable(events);

  const engine = createQueryEngine(registry, adapter);

  await pool.query("DROP TABLE IF EXISTS events");
  await pool.query(`
    CREATE TABLE events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL
    )
  `);
  console.log("✓ Table events créée");

  // Test 1 : create valide
  const valid = await engine.create("events", {
    id: "e1",
    title: "Conf OpenSya",
    startDate: "2026-09-01T09:00:00Z",
    endDate: "2026-09-01T17:00:00Z",
  });
  console.log("✓ Test 1 (create valide) ->", valid);

  // Test 2 : field validator échoue (titre vide)
  try {
    await engine.create("events", {
      id: "e2",
      title: "   ",
      startDate: "2026-09-01T09:00:00Z",
      endDate: "2026-09-01T17:00:00Z",
    });
    throw new Error("FAIL: aurait dû lever ValidationError (titre vide)");
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e;
    console.log(
      "✓ Test 2 (field validator) -> ValidationError attrapée:",
      e.failures,
    );
  }

  // Test 3 : table validator cross-field échoue (endDate avant startDate)
  try {
    await engine.create("events", {
      id: "e3",
      title: "Event invalide",
      startDate: "2026-09-01T17:00:00Z",
      endDate: "2026-09-01T09:00:00Z",
    });
    throw new Error("FAIL: aurait dû lever ValidationError (dates inversées)");
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e;
    console.log(
      "✓ Test 3 (table validator cross-field) -> ValidationError attrapée:",
      e.failures,
    );
  }

  // Test 4 : aucune ligne invalide n'a été insérée malgré les tentatives
  const all = await engine.findMany("events");
  console.log(
    "✓ Test 4 (intégrité DB) -> lignes présentes:",
    all.length,
    "(attendu: 1)",
  );
  if (all.length !== 1)
    throw new Error("FAIL: seule e1 aurait dû être insérée");

  // Test 5 : update partiel valide (ne touche que le titre, ne revalide pas les dates)
  const updated = await engine.update(
    "events",
    { id: "e1" },
    { title: "Conf OpenSya 2026" },
  );
  console.log("✓ Test 5 (update partiel valide) ->", updated);

  // Test 6 : update partiel qui casse le cross-field validator
  try {
    await engine.update(
      "events",
      { id: "e1" },
      { endDate: "2026-08-31T00:00:00Z" },
    );
    throw new Error(
      "FAIL: aurait dû lever ValidationError (update casse end > start)",
    );
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e;
    console.log(
      "✓ Test 6 (update casse cross-field) -> ValidationError attrapée:",
      e.failures,
    );
  }

  // Test 7 : getOrThrow protège contre une table inconnue AVANT tout accès DB
  try {
    await engine.findMany("does_not_exist");
    throw new Error("FAIL: aurait dû lever pour table inconnue");
  } catch (e) {
    console.log("✓ Test 7 (table inconnue) ->", (e as Error).message);
  }

  await pool.end();
  console.log("\n✅ TOUS LES TESTS QUERY ENGINE SONT PASSÉS");
}

main().catch((err) => {
  console.error("\n❌ ÉCHEC:", err);
  process.exit(1);
});
