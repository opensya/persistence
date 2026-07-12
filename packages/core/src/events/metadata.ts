import type { ColumnMetadata, TableMetadata } from "../metadata/types.js";

export interface OutboxMetadataOptions {
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

export function createOutboxMetadata(
  options: OutboxMetadataOptions = {},
): TableMetadata {
  const collectionName = options.collectionName ?? "outbox_events";

  return {
    name: options.name ?? "outboxEvents",
    collectionName,
    columns: [
      column("id", "uuid"),
      column("type", "string"),
      column("aggregateType", "string", true),
      column("aggregateId", "string", true),
      column("payload", "json"),
      column("metadata", "json"),
      column("occurredAt", "timestamp"),
      column("version", "integer"),
      column("status", "string"),
      column("attempts", "integer"),
      column("publishedAt", "timestamp", true),
      column("nextAttemptAt", "timestamp", true),
      column("lockedAt", "timestamp", true),
      column("workerId", "string", true),
      column("lastError", "text", true),
    ],
    relations: [],
    tableValidators: [],
    indexes: [
      {
        name: `${collectionName}_pending_idx`,
        fields: ["status", "nextAttemptAt", "occurredAt"],
        unique: false,
      },
      {
        name: `${collectionName}_aggregate_idx`,
        fields: ["aggregateType", "aggregateId", "occurredAt"],
        unique: false,
      },
    ],
    audit: { enabled: false },
  };
}
