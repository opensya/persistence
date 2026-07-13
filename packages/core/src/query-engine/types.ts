export interface FieldValidationFailure {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  constructor(
    public readonly table: string,
    public readonly failures: FieldValidationFailure[],
  ) {
    const summary = failures.map((f) => `${f.field}: ${f.message}`).join("; ");
    super(`Validation failed for table "${table}": ${summary}`);
    this.name = "ValidationError";
  }
}

export class UnsafeMutationError extends Error {
  constructor(operation: "update" | "delete", table: string) {
    super(
      `Unsafe ${operation} rejected for table "${table}": a non-empty filter is required.`,
    );
    this.name = "UnsafeMutationError";
  }
}

export class OptimisticLockVersionRequiredError extends Error {
  constructor(table: string, field: string) {
    super(
      `Optimistic update rejected for table "${table}": patch field "${field}" must contain the version read by the caller.`,
    );
    this.name = "OptimisticLockVersionRequiredError";
  }
}

export class OptimisticLockError extends Error {
  constructor(
    public readonly table: string,
    public readonly field: string,
    public readonly expectedVersion: number,
  ) {
    super(
      `Optimistic lock conflict on table "${table}": field "${field}" no longer has version ${expectedVersion}.`,
    );
    this.name = "OptimisticLockError";
  }
}

export class AggregateQueriesNotSupportedError extends Error {
  constructor() {
    super("The active database adapter does not support aggregate queries.");
    this.name = "AggregateQueriesNotSupportedError";
  }
}

export class InvalidAggregateQueryError extends Error {
  constructor(message: string) {
    super(`Invalid aggregate query: ${message}`);
    this.name = "InvalidAggregateQueryError";
  }
}

export class InvalidCursorError extends Error {
  constructor(message = "Invalid pagination cursor.") {
    super(message);
    this.name = "InvalidCursorError";
  }
}

export interface QueryContextInput {
  requestId?: string;
  tenantId?: string;
  user?: unknown;
  [key: string]: unknown;
}
