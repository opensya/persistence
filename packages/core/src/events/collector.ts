import { randomUUID } from "node:crypto";
import type { QueryContextInput } from "../query-engine/types.js";
import type {
  DomainEvent,
  DomainEventEmitter,
  DomainEventIdGenerator,
  EmitDomainEventOptions,
} from "./types.js";

export class DomainEventCollector<TEvents extends object>
  implements DomainEventEmitter<TEvents>
{
  private readonly pending: DomainEvent[] = [];

  constructor(
    private readonly context: QueryContextInput = {},
    private readonly generateId: DomainEventIdGenerator = randomUUID,
  ) {}

  emit<TKey extends Extract<keyof TEvents, string>>(
    type: TKey,
    payload: TEvents[TKey],
    options: EmitDomainEventOptions = {},
  ): DomainEvent<TKey, TEvents[TKey]> {
    const event: DomainEvent<TKey, TEvents[TKey]> = {
      id: this.generateId(),
      type,
      payload,
      metadata: {
        actor: this.context.user,
        tenantId: this.context.tenantId,
        requestId: this.context.requestId,
        correlationId: options.correlationId,
        causationId: options.causationId,
      },
      occurredAt: new Date(),
      version: options.version ?? 1,
      ...(options.aggregate ? { aggregate: options.aggregate } : {}),
    };

    this.pending.push(event);
    return event;
  }

  getPendingEvents(): readonly DomainEvent[] {
    return this.pending;
  }
}

export function createDomainEventCollector<TEvents extends object>(
  context?: QueryContextInput,
  generateId?: DomainEventIdGenerator,
): DomainEventCollector<TEvents> {
  return new DomainEventCollector(context, generateId);
}
