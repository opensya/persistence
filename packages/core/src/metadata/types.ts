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

/**
 * Context passed to a field's `visibility` resolver. Distinct from
 * `HookContext`/`QueryContextInput` (lifecycle hooks, mutations) because
 * this one is specifically about deciding what a *result* looks like —
 * it always carries the entity the field belongs to.
 */
export interface FieldVisibilityContext {
  user: unknown;
  entity: Readonly<Record<string, unknown>>;
  requestId?: string;
  tenantId?: string;
}

export type FieldVisibilityResolver = (
  ctx: FieldVisibilityContext,
) => boolean | Promise<boolean>;

export interface FieldTransformContext {
  operation: "create" | "update";
  field: string;
  table: string;
  entity: Readonly<Record<string, unknown>>;
  user: unknown;
  requestId?: string;
  tenantId?: string;
}

export type FieldTransformer = (
  value: unknown,
  ctx: FieldTransformContext,
) => unknown | Promise<unknown>;

export interface ColumnMetadata {
  name: string;
  columnName: string;
  type: ColumnType;
  /**
   * Optional compile-time value used to infer the shape of a JSON column.
   * It is ignored by adapters and has no effect on runtime persistence.
   */
  $type?: unknown;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  default?: unknown | (() => unknown);
  validators: FieldValidatorMetadata[];
  /**
   * Transforms a supplied value after validation and lifecycle `before` hooks,
   * immediately before it is sent to the database adapter. On updates, the
   * transformer runs only when this field is present in the patch.
   */
  transform?: FieldTransformer;
  /**
   * When true, the field is always stripped from query results — it still
   * exists in the database and can still be written to. Takes precedence
   * over `visibility` if both are set.
   */
  hidden?: boolean;
  /**
   * Per-request/per-actor visibility. Evaluated for every entity the field
   * would otherwise appear on; return `false` to strip it from that
   * specific result. This is about what a caller is allowed to *see*, not
   * what they're allowed to *write* — write access is a separate concern.
   */
  visibility?: FieldVisibilityResolver;
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

/**
 * A standalone index, as opposed to `ColumnMetadata.unique`, which covers
 * single-column uniqueness only. Use this for composite indexes (multiple
 * fields) or named single-field indexes that aren't backed by a unique
 * constraint.
 */
export interface IndexMetadata {
  /** Must be unique across the database — becomes the SQL index name. */
  name: string;
  /** Field names (not column names), in index order. */
  fields: string[];
  unique: boolean;
}

export interface AuditMetadata {
  /** Enables audit entries for mutations on this table. */
  enabled: boolean;
  /** Fields removed from both snapshots and computed changes. */
  excludedFields?: string[];
}

export interface OptimisticLockMetadata {
  /** Logical field name of the non-null integer version column. */
  field: string;
  /** Version assigned on creation. Defaults to 1. */
  initialVersion?: number;
}

export interface TableMetadata {
  name: string;
  collectionName: string;
  columns: ColumnMetadata[];
  relations: RelationMetadata[];
  tableValidators: TableValidatorMetadata[];
  /** Optional for backward compatibility with existing table definitions. */
  indexes?: IndexMetadata[];
  /** Optional per-table audit configuration. Auditing is disabled by default. */
  audit?: AuditMetadata;
  /** Enables compare-and-swap updates using an integer version field. */
  optimisticLock?: OptimisticLockMetadata;
}
