import type { DatabaseAdapter } from "../adapter/types.js";

export interface DomainEventAggregate {
  type: string;
  id: string;
}

export interface DomainEventMetadata {
  actor?: unknown;
  tenantId?: string;
  requestId?: string;
  correlationId?: string;
  causationId?: string;
}

export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  id: string;
  type: TType;
  aggregate?: DomainEventAggregate;
  payload: TPayload;
  metadata: DomainEventMetadata;
  occurredAt: Date;
  version: number;
}

export interface EmitDomainEventOptions {
  aggregate?: DomainEventAggregate;
  correlationId?: string;
  causationId?: string;
  version?: number;
}

export interface DomainEventEmitter<TEvents extends object> {
  emit<TKey extends Extract<keyof TEvents, string>>(
    type: TKey,
    payload: TEvents[TKey],
    options?: EmitDomainEventOptions,
  ): DomainEvent<TKey, TEvents[TKey]>;
}

/** Writes events with the transaction-scoped adapter used by the use case. */
export interface OutboxWriter {
  write(events: readonly DomainEvent[], adapter: DatabaseAdapter): Promise<void>;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export type OutboxEventStatus =
  | "pending"
  | "processing"
  | "published"
  | "failed";

export interface OutboxEventRecord {
  id: string;
  type: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  payload: unknown;
  metadata: DomainEventMetadata;
  occurredAt: Date;
  version: number;
  status: OutboxEventStatus;
  attempts: number;
  publishedAt?: Date | null;
  nextAttemptAt?: Date | null;
  lockedAt?: Date | null;
  workerId?: string | null;
  lastError?: string | null;
}

export interface DomainEventIdGenerator {
  (): string;
}
