---
title: Validation
description: Validate structure and domain rules before data reaches the adapter.
navigation:
  icon: i-tabler-checkup-list
---

Create and update operations run structural, field, and table validation inside the mutation transaction.

## Structural validation

Structural rules come from `ColumnMetadata`.

| Metadata type | Valid value |
| --- | --- |
| non-nullable column | neither `null` nor `undefined` |
| `integer` | integer number |
| `bigint` | bigint |
| `decimal` | string or number |
| `boolean` | boolean |
| `timestamp` | Date |
| `uuid`, `string`, `text`, `date` | string |
| `json` | any value |

## Field validators

```ts
{
  name: 'email',
  columnName: 'email',
  type: 'string',
  nullable: false,
  primaryKey: false,
  unique: true,
  validators: [
    {
      name: 'email-format',
      validate(value, entity) {
        return typeof value === 'string' && value.includes('@')
          ? { valid: true }
          : { valid: false, message: 'Enter a valid email.' }
      }
    }
  ]
}
```

The validator receives the field value and the complete read-only entity. It may return immediately or return a promise.

```ts
{
  name: 'email-availability',
  async validate(value) {
    const available = await isEmailAvailable(String(value))

    return available
      ? { valid: true }
      : { valid: false, message: 'Email already exists.' }
  }
}
```

Database constraints should still enforce race-sensitive rules such as uniqueness.

## Table validators

Use table validators when the rule depends on multiple fields.

```ts
{
  name: 'valid-period',
  fields: ['startsAt', 'endsAt'],
  validate(entity) {
    const startsAt = entity.startsAt
    const endsAt = entity.endsAt

    if (
      startsAt instanceof Date &&
      endsAt instanceof Date &&
      endsAt <= startsAt
    ) {
      return {
        valid: false,
        message: 'End must be after start.'
      }
    }

    return { valid: true }
  }
}
```

During partial updates, the validator runs when at least one field listed in `fields` is touched.

## Create validation

::u-steps{level="3"}
### Apply defaults
### Transform data through before-create hooks
### Reject fields absent from metadata
### Validate every column
### Run every table validator
### Insert only when there are no failures
::

## Update validation

The engine loads current rows, applies before-update hooks, merges the resolved patch with each current entity, then validates only touched columns and relevant table validators.

This ensures cross-field validators see the post-update entity without rewriting untouched data.

## ValidationError

```ts
try {
  await engine.create('users', input)
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message)
    console.error(error.table)
    console.error(error.failures)
  }
}
```

A failure contains a field and message:

```ts
interface FieldValidationFailure {
  field: string
  message: string
}
```

The error message now includes the aggregated failure summary:

```text
Validation failed for table "users": email: Enter a valid email.; name: This field is required.
```

The structured `failures` array remains available for API error responses and form mapping.
