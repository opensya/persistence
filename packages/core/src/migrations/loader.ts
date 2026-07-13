import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { MigrationArtifact, SchemaSnapshot } from "./types.js";
import { parseMigration, serializeMigration } from "./serialization.js";
import { EMPTY_SCHEMA_SNAPSHOT } from "./snapshot.js";
import { existsSync } from "node:fs";

export async function loadMigrations(
  directory: string,
): Promise<MigrationArtifact[]> {
  if (!existsSync(directory)) return [];

  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".json"))
    .sort();

  return Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(directory, file), "utf8");
      return parseMigration(content);
    }),
  );
}

export function lastMigration(migrations: MigrationArtifact[]): SchemaSnapshot {
  const lastMigration = migrations.at(-1)?.next ?? EMPTY_SCHEMA_SNAPSHOT;
  return lastMigration;
}

export async function saveMigration(
  directory: string,
  migration: MigrationArtifact,
) {
  if (!existsSync(directory)) await mkdir(directory, { recursive: true });

  const files = (await readdir(directory)).filter((file) =>
    file.endsWith(".json"),
  );

  const sequence = String(files.length + 1).padStart(3, "0");
  const filename = join(directory, `${sequence}-${migration.id}.json`);

  await writeFile(filename, serializeMigration(migration));
}
