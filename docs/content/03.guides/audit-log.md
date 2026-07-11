---
title: Audit Log
description: Record transactional mutation history with actors and field changes.
navigation:
  icon: i-tabler-history
---

Audit entries are written through the same transaction adapter as the mutation.
If audit persistence fails, the domain mutation rolls back.

## Enable a table

```ts
export const users = defineTable({
  // ...
  audit: {
    enabled: true,
    excludedFields: ['password', 'refreshToken']
  }
})
```

Excluded fields never appear in snapshots or computed changes. The registry
rejects unknown excluded fields.

## Create the audit table

```ts
const auditLogs = createAuditLogMetadata()
adapter.buildTable(auditLogs)
```

Create the corresponding physical `audit_logs` table with your migration
workflow. The helper only supplies runtime metadata.

## Configure the engine

```ts
const audit = createAuditManager(
  createDatabaseAuditWriter('auditLogs')
)

const engine = createQueryEngine(
  registry,
  adapter,
  hooks,
  serializer,
  audit
)
```

## Entry shape

```ts
interface AuditEntry {
  id: string
  operation: 'create' | 'update' | 'delete'
  table: string
  entityId: Record<string, unknown>
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  changes: Record<string, { before?: unknown; after?: unknown }>
  actor?: unknown
  tenantId?: string
  requestId?: string
  occurredAt: Date
}
```

The actor, tenant and request come from `QueryContextInput`. Composite primary
keys are preserved in `entityId`.

Bulk updates and deletes create one entry per affected entity. Reads never
produce audit entries, and the standard audit table has auditing disabled to
avoid recursion.

## Custom storage

Implement `AuditWriter` when entries must use a different table or storage
format. Always write through the adapter passed to `write()` to preserve
atomicity.
