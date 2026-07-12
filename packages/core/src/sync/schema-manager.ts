import type {
  DatabaseAdapter,
  SchemaCreationOptions,
  SchemaCreationResult,
} from "../adapter/types.js";
import type { MetadataRegistry } from "../metadata/registry.js";

export class SchemaCreationNotSupportedError extends Error {
  constructor() {
    super("The active database adapter does not support schema creation.");
    this.name = "SchemaCreationNotSupportedError";
  }
}

export class SchemaManager {
  constructor(
    private readonly registry: MetadataRegistry,
    private readonly adapter: DatabaseAdapter,
  ) {}

  async createTables(
    options: SchemaCreationOptions = {},
  ): Promise<SchemaCreationResult> {
    if (!this.registry.isLocked()) {
      throw new Error(
        "Cannot create database tables from an unlocked metadata registry. Call registry.lock() first.",
      );
    }

    if (!this.adapter.createTables) {
      throw new SchemaCreationNotSupportedError();
    }

    const tables = this.registry.getAll();
    for (const table of tables) this.adapter.buildTable(table);
    return this.adapter.createTables(tables, options);
  }
}

export function createSchemaManager(
  registry: MetadataRegistry,
  adapter: DatabaseAdapter,
): SchemaManager {
  return new SchemaManager(registry, adapter);
}
