export interface SchemaDrift {
  table: string;
  issues: string[];
}

export type {
  SchemaCreationOptions,
  SchemaCreationResult,
} from "../adapter/types.js";
