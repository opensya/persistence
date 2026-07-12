import type { DatabaseAdapter } from "../adapter/types.js";
import type { DomainEvent, OutboxWriter } from "./types.js";

export class DatabaseOutboxWriter implements OutboxWriter {
  constructor(private readonly tableName = "outboxEvents") {}

  async write(
    events: readonly DomainEvent[],
    adapter: DatabaseAdapter,
  ): Promise<void> {
    for (const event of events) {
      const { aggregate, ...storedEvent } = event;
      await adapter.insert(this.tableName, {
        ...storedEvent,
        aggregateType: aggregate?.type,
        aggregateId: aggregate?.id,
        status: "pending",
        attempts: 0,
        publishedAt: null,
        nextAttemptAt: null,
        lockedAt: null,
        workerId: null,
        lastError: null,
      });
    }
  }
}

export function createDatabaseOutboxWriter(
  tableName?: string,
): DatabaseOutboxWriter {
  return new DatabaseOutboxWriter(tableName);
}
