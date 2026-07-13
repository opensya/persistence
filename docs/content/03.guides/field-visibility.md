---
title: Field visibility
description: Remove hidden and context-sensitive fields from every engine result.
navigation:
  icon: i-tabler-eye-off
---

Visibility controls serialization, not storage. Validators, hooks and the
database adapter still receive complete entities; callers receive filtered ones.

## Always hidden

```ts
{
  name: 'password',
  columnName: 'password',
  type: 'string',
  nullable: false,
  primaryKey: false,
  unique: false,
  hidden: true,
  validators: []
}
```

`hidden` fields are removed from `findMany`, `findOne`, `findPage`, `create`,
`updateOne` and `updateMany`. They are also removed inside populated relations.
Type inference excludes them from returned entities.

## Contextual visibility

```ts
{
  name: 'salary',
  // ...
  visibility({ user, entity, tenantId }) {
    return canViewSalary(user, entity, tenantId)
  }
}
```

Pass the visibility context on reads:

```ts
const employee = await engine.findOne('employees', {
  where: byId(id),
  context: { user: actor, tenantId, requestId }
})
```

Resolvers run per entity and may be asynchronous. Dynamically visible fields
are optional in the inferred result because their presence depends on context.

## Trusted internal reads

Authentication and other trusted application services sometimes need a field
that must never appear in a public result. Use the explicit internal API for
that narrow boundary:

```ts
import argon2 from 'argon2'

const user = await engine.internal.findOne('users', {
  where: {
    conditions: [{ field: 'email', operator: 'eq', value: email }]
  }
})

const valid = user
  ? await argon2.verify(user.password, submittedPassword)
  : false
```

`engine.internal.findOne()` and `findMany()` bypass the `FieldSerializer` and
infer the complete entity, including `hidden` and dynamically visible columns.
They support `where`, ordering, limits and relation population like public
reads, but do not accept a visibility context because no visibility resolver
is executed.

::callout
---
icon: i-tabler-shield-lock
color: warning
variant: subtle
---
Internal results may contain passwords, tokens and personal data. Keep them
inside trusted services, never return them directly from an API handler, and
explicitly construct the safe object returned after authentication. Populated
relations are also unserialized.
::

## Inject a serializer

`QueryEngine` creates a `FieldSerializer` automatically. Pass one explicitly
when the application needs to share, extend or instrument the serialization
step:

```ts
import {
  createFieldSerializer,
  createQueryEngine
} from '@opensya/persistence'

const serializer = createFieldSerializer(registry)

const engine = createQueryEngine({
  registry,
  adapter,
  hooks,
  serializer,
  audit,
  outbox
})
```

The serializer runs after database reads and relation population, immediately
before results are returned to the caller. It applies every column's `hidden`
and `visibility` rules recursively to populated relations. It does not change
stored values or the complete entities received by validators and lifecycle
hooks.

Most applications should omit this option and use the default serializer:

```ts
const engine = createQueryEngine({ registry, adapter })
```

::callout
---
icon: i-tabler-shield-exclamation
color: warning
variant: subtle
---
Visibility is not write authorization. A hidden field can still be written.
Use hooks or a dedicated authorization layer to control mutations.
::
