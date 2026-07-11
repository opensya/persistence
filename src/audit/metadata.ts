import type { ColumnMetadata, TableMetadata } from "../metadata/types.js";

export interface AuditLogMetadataOptions {
  name?: string;
  collectionName?: string;
}

const column = (
  name: string,
  type: ColumnMetadata["type"],
  nullable = false,
): ColumnMetadata => ({
  name,
  columnName: name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
  type,
  nullable,
  primaryKey: name === "id",
  unique: name === "id",
  validators: [],
});

/** Creates the standard metadata consumed by DatabaseAuditWriter. */
export function createAuditLogMetadata(
  options: AuditLogMetadataOptions = {},
): TableMetadata {
  return {
    name: options.name ?? "auditLogs",
    collectionName: options.collectionName ?? "audit_logs",
    columns: [
      column("id", "uuid"),
      column("operation", "string"),
      column("table", "string"),
      column("entityId", "json"),
      column("before", "json", true),
      column("after", "json", true),
      column("changes", "json"),
      column("actor", "json", true),
      column("tenantId", "string", true),
      column("requestId", "string", true),
      column("occurredAt", "timestamp"),
    ],
    relations: [],
    tableValidators: [],
    indexes: [
      {
        name: `${options.collectionName ?? "audit_logs"}_table_time_idx`,
        fields: ["table", "occurredAt"],
        unique: false,
      },
      {
        name: `${options.collectionName ?? "audit_logs"}_occurred_at_idx`,
        fields: ["occurredAt"],
        unique: false,
      },
    ],
    audit: { enabled: false },
  };
}
