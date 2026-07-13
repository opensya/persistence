import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  createAuditManager,
  createDatabaseAuditWriter,
  createDatabaseOutboxWriter,
  createPostgreAdapter,
  createHooksRegistry,
  createMetadataRegistry,
  createQueryEngine,
} from "@opensya/persistence";
import {
  agendasMetadata,
  auditLogsMetadata,
  outboxEventsMetadata,
  postsMetadata,
  usersMetadata,
} from "./metadata.js";

export async function createPlayground() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Copy playground/.env.example to playground/.env.",
    );
  }

  const database = drizzle({ connection: { connectionString } });
  const pool = database.$client;

  await resetDatabase(pool);

  const adapter = createPostgreAdapter(database);
  const registry = createMetadataRegistry(
    usersMetadata,
    postsMetadata,
    agendasMetadata,
    auditLogsMetadata,
    outboxEventsMetadata,
  );
  registry.lock();

  const hooks = createHooksRegistry();
  hooks.onBeforeCreate("users", (data) => ({
    ...data,
    email:
      typeof data.email === "string"
        ? data.email.trim().toLowerCase()
        : data.email,
  }));

  const audit = createAuditManager(
    createDatabaseAuditWriter(auditLogsMetadata.name),
  );
  const outbox = createDatabaseOutboxWriter(outboxEventsMetadata.name);
  const engine = createQueryEngine({
    registry,
    adapter,
    hooks,
    audit,
    outbox,
  });
  const schemaCreation = await engine.schema.createTables();

  return {
    pool,
    adapter,
    engine,
    schemaCreation,
    close: () => pool.end(),
  };
}

async function resetDatabase(pool: Pool): Promise<void> {
  await pool.query(`
    DROP TABLE IF EXISTS playground_migration_records CASCADE;
    DROP TABLE IF EXISTS playground_posts CASCADE;
    DROP TABLE IF EXISTS playground_users CASCADE;
    DROP TABLE IF EXISTS playground_audit_logs CASCADE;
    DROP TABLE IF EXISTS playground_outbox_events CASCADE;
    DROP TABLE IF EXISTS playground_agendas CASCADE;
    DROP TABLE IF EXISTS _opensya_migrations CASCADE;
  `);
}
