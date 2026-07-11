import assert from "node:assert/strict";
import {
  createOutboxProcessor,
  type AuditEntry,
  type DomainEvent,
  type OutboxEventRecord,
} from "@opensya/persistence";
import { runScenario } from "./helpers.js";

export async function auditAndDomainEventsScenario(): Promise<void> {
  await runScenario("transactional audit and domain events", async (playground) => {
    const { engine, adapter } = playground;
    const user = await engine.create(
      "users",
      { email: "events@example.com", secret: "must-not-be-audited" },
      {
        user: { id: "recruiter-1" },
        tenantId: "tenant-1",
        requestId: "request-1",
      },
    );

    const auditEntries = await adapter.findMany<AuditEntry>("auditLogs");
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0]?.operation, "create");
    assert.equal(auditEntries[0]?.tenantId, "tenant-1");
    assert.equal("secret" in (auditEntries[0]?.after ?? {}), false);

    const post = await engine.transaction(
      {
        user: { id: "recruiter-1" },
        tenantId: "tenant-1",
        requestId: "publish-post-1",
      },
      async (tx) => {
        const created = await tx.create("posts", {
          authorId: user.id,
          title: "Domain events",
        });
        tx.events.emit(
          "post.published",
          { postId: created.id, authorId: user.id },
          {
            aggregate: { type: "post", id: created.id },
            correlationId: "publish-post-1",
          },
        );
        return created;
      },
    );

    const pending = await adapter.findMany<OutboxEventRecord>("outboxEvents");
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.status, "pending");
    assert.equal(pending[0]?.aggregateId, post.id);

    const published: DomainEvent[] = [];
    const processor = createOutboxProcessor(adapter, {
      async publish(event) {
        published.push(event);
      },
    });
    const result = await processor.processBatch();
    assert.deepEqual(result, { published: 1, retried: 0, failed: 0 });
    assert.equal(published[0]?.type, "post.published");
    assert.deepEqual(published[0]?.payload, {
      postId: post.id,
      authorId: user.id,
    });

    const processed = await adapter.findOne<OutboxEventRecord>("outboxEvents");
    assert.equal(processed?.status, "published");
    assert.ok(processed?.publishedAt instanceof Date);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await auditAndDomainEventsScenario();
}
