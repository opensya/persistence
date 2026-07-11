import type { DatabaseAdapter } from "../adapter/types.js";

export type AuditOperation = "create" | "update" | "delete";

export interface AuditFieldChange {
  before?: unknown;
  after?: unknown;
}

export interface AuditEntry {
  id: string;
  operation: AuditOperation;
  table: string;
  entityId: Record<string, unknown>;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changes: Record<string, AuditFieldChange>;
  actor?: unknown;
  tenantId?: string;
  requestId?: string;
  occurredAt: Date;
}

/**
 * Persists an audit entry. The supplied adapter is the transaction-scoped
 * adapter used by the mutation and must be used for any database write.
 */
export interface AuditWriter {
  write(entry: AuditEntry, adapter: DatabaseAdapter): Promise<void>;
}

export interface AuditIdGenerator {
  (): string;
}
