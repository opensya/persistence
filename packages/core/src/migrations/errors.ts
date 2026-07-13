export class MigrationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class MigrationsNotSupportedError extends MigrationError {
  constructor() {
    super("The active database adapter does not support migrations.");
  }
}

export class MigrationChecksumError extends MigrationError {
  constructor(readonly migrationId: string) {
    super(`Migration "${migrationId}" has an invalid or unexpected checksum.`);
  }
}

export class MigrationSequenceError extends MigrationError {
  constructor(readonly migrationId: string, readonly previousMigrationId: string) {
    super(
      `Migration "${migrationId}" does not continue from "${previousMigrationId}".`,
    );
  }
}

export class MigrationMetadataMismatchError extends MigrationError {
  constructor() {
    super(
      "The current metadata does not match the latest migration snapshot. Generate a migration before planning or applying.",
    );
  }
}

export class DestructiveMigrationError extends MigrationError {
  constructor() {
    super(
      "Migration plan contains destructive operations. Pass allowDestructive: true after reviewing the plan.",
    );
  }
}
