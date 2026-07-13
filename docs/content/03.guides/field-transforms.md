---
title: Field transforms
description: Transform validated field values immediately before database writes.
navigation:
  icon: i-tabler-transform
---

Field transforms convert values immediately before they are sent to the
database adapter. They are useful for password hashing, encryption and
canonical normalization.

## Hash a password

Declare an asynchronous `transform` on the column metadata:

```ts
import { hash } from 'argon2'
import { defineTable } from '@opensya/persistence'

export const usersMetadata = defineTable({
  name: 'users',
  collectionName: 'users',
  columns: [
    // Other columns...
    {
      name: 'password',
      columnName: 'password_hash',
      type: 'string',
      nullable: false,
      primaryKey: false,
      unique: false,
      hidden: true,
      validators: [
        {
          name: 'password-length',
          validate(value) {
            return typeof value === 'string' && value.length >= 12
              ? { valid: true }
              : { valid: false, message: 'Use at least 12 characters.' }
          }
        }
      ],
      transform(value) {
        return hash(value as string)
      }
    }
  ],
  relations: [],
  tableValidators: []
})
```

Creating or updating the password uses the same metadata rule:

```ts
await engine.create('users', {
  password: 'a-long-plain-text-password'
})

await engine.updateOne(
  'users',
  { conditions: [{ field: 'id', operator: 'eq', value: userId }] },
  { password: 'a-new-long-password' }
)
```

The validator receives the submitted plain-text value. The transform then
hashes it, and only the transformed value reaches the adapter. On update, the
transform runs only when `password` is present in the patch, so unrelated
updates never hash an existing hash again.

## Transformation context

The transformer may be asynchronous and receives the mutation context:

```ts
transform(value, { operation, table, field, user, tenantId, requestId }) {
  return encryptionService.encrypt(value, {
    operation,
    table,
    field,
    user,
    tenantId,
    requestId
  })
}
```

The execution order is:

1. create defaults;
2. `beforeCreate` or `beforeUpdate` hooks;
3. structural, field and table validation;
4. field transforms;
5. adapter write;
6. `afterCreate` or `afterUpdate` hooks and audit recording.

Transforms affect writes only. `hidden` and `visibility` remain responsible
for filtering values returned to callers.
