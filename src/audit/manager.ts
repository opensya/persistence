import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { DatabaseAdapter } from "../adapter/types.js";
import type { TableMetadata } from "../metadata/types.js";
import type { QueryContextInput } from "../query-engine/types.js";
import type {
  AuditEntry,
  AuditFieldChange,
  AuditIdGenerator,
  AuditOperation,
  AuditWriter,
} from "./types.js";

interface RecordAuditInput {
  operation: AuditOperation;
  table: TableMetadata;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  context: QueryContextInput;
  adapter: DatabaseAdapter;
}

export class AuditManager {
  constructor(
    private readonly writer: AuditWriter,
    private readonly generateId: AuditIdGenerator = randomUUID,
  ) {}

  isEnabled(table: TableMetadata): boolean {
    return table.audit?.enabled === true;
  }

  async record(input: RecordAuditInput): Promise<void> {
    if (!this.isEnabled(input.table)) return;

    const excluded = new Set(input.table.audit?.excludedFields ?? []);
    const before = this.sanitize(input.before, excluded);
    const after = this.sanitize(input.after, excluded);

    const entry: AuditEntry = {
      id: this.generateId(),
      operation: input.operation,
      table: input.table.name,
      entityId: this.getEntityId(input.table, input.after ?? input.before ?? {}),
      before,
      after,
      changes: this.getChanges(before, after),
      actor: input.context.user,
      tenantId: input.context.tenantId,
      requestId: input.context.requestId,
      occurredAt: new Date(),
    };

    await this.writer.write(entry, input.adapter);
  }

  private sanitize(
    entity: Record<string, unknown> | null,
    excluded: ReadonlySet<string>,
  ): Record<string, unknown> | null {
    if (!entity) return null;

    return Object.fromEntries(
      Object.entries(entity).filter(([field]) => !excluded.has(field)),
    );
  }

  private getEntityId(
    table: TableMetadata,
    entity: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      table.columns
        .filter((column) => column.primaryKey)
        .map((column) => [column.name, entity[column.name]]),
    );
  }

  private getChanges(
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
  ): Record<string, AuditFieldChange> {
    const fields = new Set([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
    ]);
    const changes: Record<string, AuditFieldChange> = {};

    for (const field of fields) {
      const previous = before?.[field];
      const current = after?.[field];
      if (isDeepStrictEqual(previous, current)) continue;

      changes[field] = {
        ...(before ? { before: previous } : {}),
        ...(after ? { after: current } : {}),
      };
    }

    return changes;
  }
}

export function createAuditManager(
  writer: AuditWriter,
  generateId?: AuditIdGenerator,
): AuditManager {
  return new AuditManager(writer, generateId);
}
