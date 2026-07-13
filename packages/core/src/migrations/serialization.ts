import { createHash } from "node:crypto";
import type { MigrationArtifact, MigrationValue } from "./types.js";

export function normalizeMigrationValue(value: unknown): MigrationValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Migration values must contain finite numbers.");
    }
    return value;
  }
  if (typeof value === "bigint") {
    return { $type: "bigint", value: value.toString() };
  }
  if (value instanceof Date) {
    return { $type: "date", value: value.toISOString() };
  }
  if (Array.isArray(value)) return value.map(normalizeMigrationValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeMigrationValue(item)]),
    );
  }
  throw new Error(`Unsupported migration value type "${typeof value}".`);
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function migrationChecksum(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function serializeMigration(migration: MigrationArtifact): string {
  return `${JSON.stringify(migration, null, 2)}\n`;
}

export function parseMigration(value: string): MigrationArtifact {
  const migration = JSON.parse(value) as MigrationArtifact;
  if (migration.version !== 1 || !migration.id || !migration.checksum) {
    throw new Error("Invalid migration artifact.");
  }
  const checksum = migrationChecksum({
    name: migration.name,
    previous: migration.previous,
    next: migration.next,
    operations: migration.operations,
  });
  if (checksum !== migration.checksum) {
    throw new Error(`Migration "${migration.id}" has an invalid checksum.`);
  }
  return migration;
}
