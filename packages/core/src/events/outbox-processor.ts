import { randomUUID } from "node:crypto";
import type { DatabaseAdapter, QueryFilter } from "../adapter/types.js";
import type {
  DomainEvent,
  EventPublisher,
  OutboxEventRecord,
} from "./types.js";

export interface OutboxProcessorOptions {
  tableName?: string;
  batchSize?: number;
  maxAttempts?: number;
  retryDelay?: (attempt: number) => number;
  workerId?: string;
  processingTimeoutMs?: number;
}

export interface OutboxBatchResult {
  published: number;
  retried: number;
  failed: number;
}

export class OutboxProcessor {
  private readonly tableName: string;
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly retryDelay: (attempt: number) => number;
  private readonly workerId: string;
  private readonly processingTimeoutMs: number;

  constructor(
    private readonly adapter: DatabaseAdapter,
    private readonly publisher: EventPublisher,
    options: OutboxProcessorOptions = {},
  ) {
    this.tableName = options.tableName ?? "outboxEvents";
    this.batchSize = options.batchSize ?? 100;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.retryDelay =
      options.retryDelay ?? ((attempt) => Math.min(1_000 * 2 ** attempt, 60_000));
    this.workerId = options.workerId ?? randomUUID();
    this.processingTimeoutMs = options.processingTimeoutMs ?? 5 * 60_000;
  }

  async processBatch(now = new Date()): Promise<OutboxBatchResult> {
    await this.releaseStaleClaims(now);
    const candidates = await this.adapter.findMany<OutboxEventRecord>(
      this.tableName,
      {
        where: this.pendingFilter(now),
        orderBy: [{ field: "occurredAt", direction: "asc" }],
        limit: this.batchSize,
      },
    );
    const result: OutboxBatchResult = { published: 0, retried: 0, failed: 0 };

    for (const candidate of candidates) {
      const claimed = await this.claim(candidate.id, now);
      if (!claimed) continue;

      try {
        await this.publisher.publish(this.toDomainEvent(claimed));
        await this.markPublished(claimed.id, now);
        result.published += 1;
      } catch (error) {
        const failed = await this.markForRetry(claimed, error, now);
        result[failed ? "failed" : "retried"] += 1;
      }
    }

    return result;
  }

  private async releaseStaleClaims(now: Date): Promise<void> {
    await this.adapter.update(
      this.tableName,
      {
        conditions: [
          { field: "status", operator: "eq", value: "processing" },
          {
            field: "lockedAt",
            operator: "lte",
            value: new Date(now.getTime() - this.processingTimeoutMs),
          },
        ],
      },
      {
        status: "pending",
        lockedAt: null,
        workerId: null,
      },
    );
  }

  private async claim(
    id: string,
    now: Date,
  ): Promise<OutboxEventRecord | null> {
    return this.adapter.transaction(async (tx) => {
      const [claimed] = await tx.update<OutboxEventRecord>(
        this.tableName,
        {
          conditions: [
            { field: "id", operator: "eq", value: id },
            { field: "status", operator: "eq", value: "pending" },
          ],
        },
        {
          status: "processing",
          lockedAt: now,
          workerId: this.workerId,
        },
      );
      return claimed ?? null;
    });
  }

  private markPublished(id: string, now: Date): Promise<unknown> {
    return this.adapter.update(
      this.tableName,
      this.ownedProcessingFilter(id),
      {
        status: "published",
        publishedAt: now,
        lockedAt: null,
        workerId: null,
        lastError: null,
      },
    );
  }

  private async markForRetry(
    event: OutboxEventRecord,
    error: unknown,
    now: Date,
  ): Promise<boolean> {
    const attempts = event.attempts + 1;
    const failed = attempts >= this.maxAttempts;
    await this.adapter.update(
      this.tableName,
      this.ownedProcessingFilter(event.id),
      {
        status: failed ? "failed" : "pending",
        attempts,
        nextAttemptAt: failed
          ? null
          : new Date(now.getTime() + this.retryDelay(attempts)),
        lockedAt: null,
        workerId: null,
        lastError: error instanceof Error ? error.message : String(error),
      },
    );
    return failed;
  }

  private pendingFilter(now: Date): QueryFilter {
    return {
      conditions: [{ field: "status", operator: "eq", value: "pending" }],
      and: [
        {
          or: [
            {
              conditions: [
                { field: "nextAttemptAt", operator: "isNull" },
              ],
            },
            {
              conditions: [
                { field: "nextAttemptAt", operator: "lte", value: now },
              ],
            },
          ],
        },
      ],
    };
  }

  private ownedProcessingFilter(id: string): QueryFilter {
    return {
      conditions: [
        { field: "id", operator: "eq", value: id },
        { field: "status", operator: "eq", value: "processing" },
        { field: "workerId", operator: "eq", value: this.workerId },
      ],
    };
  }

  private toDomainEvent(record: OutboxEventRecord): DomainEvent {
    return {
      id: record.id,
      type: record.type,
      payload: record.payload,
      metadata: record.metadata,
      occurredAt: record.occurredAt,
      version: record.version,
      ...(record.aggregateType && record.aggregateId
        ? {
            aggregate: {
              type: record.aggregateType,
              id: record.aggregateId,
            },
          }
        : {}),
    };
  }
}

export function createOutboxProcessor(
  adapter: DatabaseAdapter,
  publisher: EventPublisher,
  options?: OutboxProcessorOptions,
): OutboxProcessor {
  return new OutboxProcessor(adapter, publisher, options);
}
