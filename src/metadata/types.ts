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

interface BaseRelationMetadata {
  name: string;
  target: string;
}

export interface ManyToOneRelationMetadata extends BaseRelationMetadata {
  kind: "manyToOne";
  foreignKey: string;
  references?: string;
}

export interface OneToOneRelationMetadata extends BaseRelationMetadata {
  kind: "oneToOne";
  foreignKey: string;
  references?: string;
}

export interface OneToManyRelationMetadata extends BaseRelationMetadata {
  kind: "oneToMany";
  foreignKey: string;
  references?: string;
}

export interface ManyToManyRelationMetadata extends BaseRelationMetadata {
  kind: "manyToMany";
  through: {
    table: string;
    sourceForeignKey: string;
    targetForeignKey: string;
  };
  sourceKey?: string;
  targetKey?: string;
}

export type RelationMetadata =
  | ManyToOneRelationMetadata
  | OneToOneRelationMetadata
  | OneToManyRelationMetadata
  | ManyToManyRelationMetadata;

export interface TableValidatorMetadata {
  name: string;
  fields: string[];
  validate: (
    entity: Readonly<Record<string, unknown>>,
  ) => ValidationResult | Promise<ValidationResult>;
}

export interface TableMetadata {
  name: string;
  collectionName: string;
  columns: ColumnMetadata[];
  relations: RelationMetadata[];
  tableValidators: TableValidatorMetadata[];
}
