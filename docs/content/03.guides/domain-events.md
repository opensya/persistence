---
title: Domain Events
description: Persist typed business events atomically and publish them from an outbox.
navigation:
  icon: i-tabler-broadcast
---

A Domain Event describes a business fact that already happened:
`candidate.hired`, `job.published`, or `application.rejected`.

Persistence stores the fact in a transactional outbox. External publication is
handled later by an `OutboxProcessor`.

## Configure the outbox

```ts
const outboxMetadata = createOutboxMetadata()
adapter.buildTable(outboxMetadata)

const outbox = createDatabaseOutboxWriter('outboxEvents')

const engine = createQueryEngine({
  registry,
  adapter,
  hooks,
  serializer,
  audit,
  outbox
})
```

Create the physical `outbox_events` table with migrations. The metadata helper
defines pending, processing, published and failed states plus retry fields.

## Emit inside a use case

```ts
await engine.transaction(context, async tx => {
  const application = await tx.updateOne(
    'applications',
    byId(applicationId),
    { status: 'hired' }
  )

  if (!application) throw new Error('Application not found')

  tx.events.emit(
    'candidate.hired',
    {
      candidateId: application.candidateId,
      applicationId: application.id
    },
    {
      aggregate: { type: 'application', id: application.id },
      correlationId: context.requestId,
      version: 1
    }
  )
})
```

`emit()` only collects the event. The outer transaction writes every event after
the callback succeeds. Emitting without a configured `OutboxWriter` rejects the
transaction.

## Publish pending events

```ts
const processor = createOutboxProcessor(
  adapter,
  {
    async publish(event) {
      await messageBroker.publish(event.type, event)
    }
  },
  {
    batchSize: 100,
    maxAttempts: 5,
    processingTimeoutMs: 5 * 60_000
  }
)

const result = await processor.processBatch()
```

The processor:

- loads due pending events in occurrence order;
- claims each record for one worker;
- marks successful events as published;
- retries failures with configurable exponential backoff;
- marks exhausted events as failed;
- releases stale processing claims after a timeout.

## Delivery guarantee

The outbox provides **at-least-once delivery**. A worker may publish an event and
stop before marking it as published. Consumers must therefore be idempotent,
usually by storing processed event IDs.

::callout
---
icon: i-tabler-plug-connected
color: info
variant: subtle
---
Persistence defines `EventPublisher`; it does not depend on Kafka, RabbitMQ,
Redis, webhooks or any other transport.
::
