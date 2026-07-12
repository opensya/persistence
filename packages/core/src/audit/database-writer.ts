import type { DatabaseAdapter } from "../adapter/types.js";
import type { AuditEntry, AuditWriter } from "./types.js";

/**
 * Stores audit entries through a logical table already registered with the
 * database adapter. Consumers remain in control of that table's physical
 * name and schema through their regular TableMetadata definition.
 */
export class DatabaseAuditWriter implements AuditWriter {
  constructor(private readonly tableName = "auditLogs") {}

  async write(entry: AuditEntry, adapter: DatabaseAdapter): Promise<void> {
    await adapter.insert(this.tableName, { ...entry });
  }
}

export function createDatabaseAuditWriter(
  tableName?: string,
): DatabaseAuditWriter {
  return new DatabaseAuditWriter(tableName);
}
