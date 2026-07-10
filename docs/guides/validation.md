# Validation

The query engine performs structural validation and custom validation before inserting or updating data.

## Structural validation

Structural validation is derived from column metadata:

- non-nullable fields cannot be `null` or `undefined`;
- integers must be integer numbers;
- bigint values must use the JavaScript `bigint` type;
- booleans must be booleans;
- timestamps must be `Date` instances;
- UUID, string, text, and date values must be strings;
- decimal values may be strings or numbers;
- JSON accepts any value.

## Field validators

A field validator receives the value and the full entity:

```ts
{
  name: "email",
  columnName: "email",
  type: "string",
  nullable: false,
  primaryKey: false,
  unique: true,

  validators: [
    {
      name: "valid-email",

      validate: (value) => {
        if (typeof value !== "string" || !value.includes("@")) {
          return {
            valid: false,
            message: "A valid email is required.",
          };
        }

        return { valid: true };
      },
    },
  ],
}
```

Validators may be asynchronous:

```ts
{
  name: "unique-email",

  async validate(value) {
    const available = await isEmailAvailable(String(value));

    return available
      ? { valid: true }
      : { valid: false, message: "This email is already used." };
  },
}
```

Prefer enforcing uniqueness in the database as well. Application validation alone cannot prevent race conditions.

## Cross-field validation

The second field-validator argument contains the complete entity:

```ts
{
  name: "end-after-start",

  validate(value, entity) {
    const start = entity.startAt;
    const end = value;

    if (!(start instanceof Date) || !(end instanceof Date)) {
      return { valid: true };
    }

    return end > start
      ? { valid: true }
      : {
          valid: false,
          message: "The end date must be after the start date.",
        };
  },
}
```

For domain rules involving several fields, table validators communicate intent more clearly.

## Table validators

```ts
const tableValidator = {
  name: "valid-period",
  fields: ["startAt", "endAt"],

  validate(entity) {
    const start = entity.startAt;
    const end = entity.endAt;

    if (start instanceof Date && end instanceof Date && end <= start) {
      return {
        valid: false,
        message: "The period is invalid.",
      };
    }

    return { valid: true };
  },
};
```

The `fields` list determines when the validator is rerun during an update. It runs when at least one listed field is present in the patch.

## Validation errors

Failed validations are aggregated:

```ts
import { ValidationError } from "@opensya/persistence";

try {
  await engine.create("users", input);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.table);
    console.error(error.failures);
  }
}
```

Each failure contains:

```ts
interface FieldValidationFailure {
  field: string;
  message: string;
}
```

Table-validator failures use the comma-separated validator field names as the failure field.

## Update behavior

For updates, the engine:

1. loads the current entity;
2. applies before-update hooks to the patch;
3. merges the patch into the current entity;
4. validates structural and custom rules for touched fields;
5. runs relevant table validators;
6. writes the patch.

This allows validators to inspect the complete post-update entity without rewriting untouched fields.
