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
