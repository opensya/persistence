// ============================================================================
// COLUMN — la plus petite unité structurelle
// ============================================================================

export type ColumnType =
  | "uuid"
  | "string"
  | "text"
  | "integer"
  | "bigint"
  | "boolean"
  | "timestamp"
  | "date"
  | "json"
  | "decimal";

export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export interface FieldValidatorMetadata {
  name: string;
  validate: (
    value: unknown,
    entity: Readonly<Record<string, unknown>>,
  ) => ValidationResult | Promise<ValidationResult>;
}

export interface ColumnMetadata {
  name: string;
  columnName: string;
  type: ColumnType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  default?: unknown | (() => unknown);
  validators: FieldValidatorMetadata[];
}

// ============================================================================
// RELATION
// ============================================================================

export type RelationKind =
  | "oneToOne"
  | "oneToMany"
  | "manyToOne"
  | "manyToMany";

export interface RelationMetadata {
  name: string;
  kind: RelationKind;
  target: string;
  foreignKey?: string;
  references?: string;
  through?: string;
}

// ============================================================================
// TABLE VALIDATOR — validation cross-field
// ============================================================================

export interface TableValidatorMetadata {
  name: string;
  fields: string[];
  validate: (
    entity: Readonly<Record<string, unknown>>,
  ) => ValidationResult | Promise<ValidationResult>;
}

// ============================================================================
// TABLE — la racine
// ============================================================================

export interface TableMetadata {
  name: string;
  collectionName: string;
  columns: ColumnMetadata[];
  relations: RelationMetadata[];
  tableValidators: TableValidatorMetadata[];
}
