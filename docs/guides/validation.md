---
title: Validation
description: Combine structural checks with synchronous, asynchronous, and cross-field validators.
navigation:
  icon: i-tabler-checkup-list
---

The Query Engine validates entities before inserting or updating them.

## Validation layers

::u-page-grid
  ::u-page-card
  ---
  title: Structural validation
  description: Enforces nullability and JavaScript value types from column metadata.
  icon: i-tabler-braces
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  title: Field validators
  description: Run custom synchronous or asynchronous rules against a field and entity.
  icon: i-tabler-input-check
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  title: Table validators
  description: Express domain rules involving several fields.
  icon: i-tabler-table-check
  spotlight: true
  ---
  ::
::

## Structural validation

::u-accordion
  :::u-accordion-item{label="Required values" icon="i-tabler-asterisk"}
  A non-nullable field rejects both `null` and `undefined`.
  :::

  :::u-accordion-item{label="Numeric values" icon="i-tabler-number"}
  `integer` requires an integer number, `bigint` requires a JavaScript `bigint`, and `decimal` accepts a string or number.
  :::

  :::u-accordion-item{label="Dates and timestamps" icon="i-tabler-calendar"}
  `timestamp` requires a `Date` instance, while `date` currently expects a string.
  :::

  :::u-accordion-item{label="Other values" icon="i-tabler-code"}
  UUID, string, and text values require strings; booleans require booleans; JSON accepts any value.
  :::
::

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
      name: 'valid-email',

      validate: value => {
        if (typeof value !== 'string' || !value.includes('@')) {
          return {
            valid: false,
            message: 'A valid email is required.'
          }
        }

        return { valid: true }
      }
    }
  ]
}
```

A validator receives the field value and a read-only view of the complete entity.

## Asynchronous validation

```ts
{
  name: 'available-email',

  async validate(value) {
    const available = await isEmailAvailable(String(value))

    return available
      ? { valid: true }
      : {
          valid: false,
          message: 'This email is already used.'
        }
  }
}
```

::u-callout
---
icon: i-tabler-database-shield
color: warning
variant: subtle
title: Keep database constraints
---
Application validation cannot prevent every race condition. Preserve database constraints for uniqueness and referential integrity.
::

## Cross-field rules

::u-tabs
  :::u-tab{label="Field validator" icon="i-tabler-input-check"}
  ```ts
  {
    name: 'end-after-start',

    validate(value, entity) {
      const start = entity.startAt
      const end = value

      if (!(start instanceof Date) || !(end instanceof Date)) {
        return { valid: true }
      }

      return end > start
        ? { valid: true }
        : {
            valid: false,
            message: 'The end date must be after the start date.'
          }
    }
  }
  ```
  :::

  :::u-tab{label="Table validator" icon="i-tabler-table-check"}
  ```ts
  {
    name: 'valid-period',
    fields: ['startAt', 'endAt'],

    validate(entity) {
      const start = entity.startAt
      const end = entity.endAt

      if (start instanceof Date && end instanceof Date && end <= start) {
        return {
          valid: false,
          message: 'The period is invalid.'
        }
      }

      return { valid: true }
    }
  }
  ```

  The `fields` list determines when the validator is rerun during an update.
  :::
::

## Validation errors

```ts
import { ValidationError } from '@opensya/persistence'

try {
  await engine.create('users', input)
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.table)
    console.error(error.failures)
  }
}
```

::u-callout
---
icon: i-tabler-list-details
color: info
variant: subtle
---
Failures are aggregated. Each entry contains a `field` and a human-readable `message`.
::

## Update validation pipeline

::u-steps{level="3"}
### Load the current entity
### Run before-update hooks on the patch
### Verify every patched field
### Merge the patch with current data
### Validate touched fields
### Run table validators affected by the patch
### Persist the resolved patch
::

Untouched invalid data is not rediscovered during every partial update.
