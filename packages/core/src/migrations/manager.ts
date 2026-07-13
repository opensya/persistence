import type { DatabaseAdapter } from "../adapter/types.js";
import type { MetadataRegistry } from "../metadata/registry.js";
import { diffSchemaSnapshots } from "./differ.js";
import {
  MigrationChecksumError,
  MigrationMetadataMismatchError,
  MigrationSequenceError,
  MigrationsNotSupportedError,
} from "./errors.js";
import { migrationChecksum } from "./serialization.js";
import { createSchemaSnapshot, EMPTY_SCHEMA_SNAPSHOT } from "./snapshot.js";
import type {
  ApplyMigrationsOptions,
  GenerateMigrationOptions,
  MigrationApplyResult,
  MigrationArtifact,
  MigrationPlan,
  MigrationStatusEntry,
  SchemaSnapshot,
} from "./types.js";

export class MigrationManager {
  constructor(
    private readonly registry: MetadataRegistry,
    private readonly adapter: DatabaseAdapter,
  ) {}

  snapshot(): SchemaSnapshot {
    this.assertLocked();
    return createSchemaSnapshot(this.registry);
  }

  generate(options: GenerateMigrationOptions): MigrationArtifact {
    this.assertLocked();
    const name = options.name.trim();
    if (!name) throw new Error("A migration name is required.");
    const previous = options.previous ?? EMPTY_SCHEMA_SNAPSHOT;
    const next = this.snapshot();
    const operations = diffSchemaSnapshots(previous, next);
    const checksum = migrationChecksum({ name, previous, next, operations });
    return {
      version: 1,
      id: `${slugify(name)}-${checksum.slice(0, 12)}`,
      name,
      createdAt: options.createdAt ?? new Date().toISOString(),
      checksum,
      previous,
      next,
      operations,
    };
  }

  plan(migrations: readonly MigrationArtifact[]): Promise<MigrationPlan> {
    if (!this.adapter.planMigrations) throw new MigrationsNotSupportedError();
    this.assertArtifacts(migrations);
    this.assertCurrentSnapshot(migrations);
    return this.adapter.planMigrations(migrations);
  }

  status(
    migrations: readonly MigrationArtifact[],
  ): Promise<MigrationStatusEntry[]> {
    if (!this.adapter.migrationStatus) throw new MigrationsNotSupportedError();
    this.assertArtifacts(migrations);
    return this.adapter.migrationStatus(migrations);
  }

  apply(
    migrations: readonly MigrationArtifact[],
    options: ApplyMigrationsOptions = {},
  ): Promise<MigrationApplyResult> {
    if (!this.adapter.applyMigrations) throw new MigrationsNotSupportedError();
    this.assertArtifacts(migrations);
    this.assertCurrentSnapshot(migrations);
    return this.adapter.applyMigrations(migrations, options);
  }

  private assertLocked(): void {
    if (!this.registry.isLocked()) {
      throw new Error(
        "Cannot generate migrations from an unlocked metadata registry. Call registry.lock() first.",
      );
    }
  }

  private assertArtifacts(migrations: readonly MigrationArtifact[]): void {
    const ids = new Set<string>();
    for (const [index, migration] of migrations.entries()) {
      if (ids.has(migration.id)) {
        throw new Error(`Duplicate migration id "${migration.id}".`);
      }
      ids.add(migration.id);
      const checksum = migrationChecksum({
        name: migration.name,
        previous: migration.previous,
        next: migration.next,
        operations: migration.operations,
      });
      if (checksum !== migration.checksum) {
        throw new MigrationChecksumError(migration.id);
      }
      const previousMigration = migrations[index - 1];
      if (
        previousMigration &&
        migrationChecksum(previousMigration.next) !==
          migrationChecksum(migration.previous)
      ) {
        throw new MigrationSequenceError(migration.id, previousMigration.id);
      }
    }
  }

  private assertCurrentSnapshot(
    migrations: readonly MigrationArtifact[],
  ): void {
    const last = migrations.at(-1);
    const expected = last?.next ?? EMPTY_SCHEMA_SNAPSHOT;
    if (migrationChecksum(expected) !== migrationChecksum(this.snapshot())) {
      throw new MigrationMetadataMismatchError();
    }
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "migration";
}
