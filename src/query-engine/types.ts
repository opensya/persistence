export interface FieldValidationFailure {
  field: string;
  message: string;
}

/**
 * Levée quand un create/update échoue la validation. Toutes les erreurs
 * sont agrégées (voir MetadataRegistry.validate() pour le même principe côté
 * schema) plutôt que de s'arrêter au premier champ invalide.
 */
export class ValidationError extends Error {
  readonly table: string;
  readonly failures: FieldValidationFailure[];

  constructor(table: string, failures: FieldValidationFailure[]) {
    const summary = failures.map((f) => `${f.field}: ${f.message}`).join("; ");
    super(`Validation échouée pour la table "${table}" : ${summary}`);
    this.name = "ValidationError";
    this.table = table;
    this.failures = failures;
  }
}
