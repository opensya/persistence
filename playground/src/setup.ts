import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  createAuditManager,
  createDatabaseAuditWriter,
  createDatabaseOutboxWriter,
  createDrizzleAdapter,
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

  const adapter = createDrizzleAdapter(database);
  for (const metadata of [
    usersMetadata,
    postsMetadata,
    agendasMetadata,
    auditLogsMetadata,
    outboxEventsMetadata,
  ]) {
    adapter.buildTable(metadata);
  }

  const registry = createMetadataRegistry(
    usersMetadata,
    postsMetadata,
    agendasMetadata,
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
  const engine = createQueryEngine(
    registry,
    adapter,
    hooks,
    undefined,
    audit,
    outbox,
  );

  return {
    pool,
    adapter,
    engine,
    close: () => pool.end(),
  };
}

async function resetDatabase(pool: Pool): Promise<void> {
  await pool.query(`
    DROP TABLE IF EXISTS playground_posts CASCADE;
    DROP TABLE IF EXISTS playground_users CASCADE;
    DROP TABLE IF EXISTS playground_audit_logs CASCADE;
    DROP TABLE IF EXISTS playground_outbox_events CASCADE;

    CREATE TABLE playground_users (
      id uuid PRIMARY KEY,
      email text NOT NULL UNIQUE,
      secret text NOT NULL,
      created_at timestamp NOT NULL
    );

    CREATE TABLE playground_posts (
      id uuid PRIMARY KEY,
      author_id uuid NOT NULL REFERENCES playground_users(id) ON DELETE CASCADE,
      title text NOT NULL,
      published_at timestamp NOT NULL
    );

    CREATE INDEX playground_posts_author_published_idx
      ON playground_posts (author_id, published_at);

    CREATE TABLE playground_audit_logs (
      id uuid PRIMARY KEY,
      operation text NOT NULL,
      "table" text NOT NULL,
      entity_id json NOT NULL,
      before json,
      after json,
      changes json NOT NULL,
      actor json,
      tenant_id text,
      request_id text,
      occurred_at timestamp NOT NULL
    );

    CREATE INDEX playground_audit_logs_table_time_idx
      ON playground_audit_logs ("table", occurred_at);
    CREATE INDEX playground_audit_logs_occurred_at_idx
      ON playground_audit_logs (occurred_at);

    CREATE TABLE playground_outbox_events (
      id uuid PRIMARY KEY,
      type text NOT NULL,
      aggregate_type text,
      aggregate_id text,
      payload json NOT NULL,
      metadata json NOT NULL,
      occurred_at timestamp NOT NULL,
      version integer NOT NULL,
      status text NOT NULL,
      attempts integer NOT NULL,
      published_at timestamp,
      next_attempt_at timestamp,
      locked_at timestamp,
      worker_id text,
      last_error text
    );

    CREATE INDEX playground_outbox_events_pending_idx
      ON playground_outbox_events (status, next_attempt_at, occurred_at);
    CREATE INDEX playground_outbox_events_aggregate_idx
      ON playground_outbox_events (aggregate_type, aggregate_id, occurred_at);
  `);
}
