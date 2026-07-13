---
title: Optimistic locking
description: Prevent concurrent users from silently overwriting each other's changes.
navigation:
  icon: i-tabler-lock-check
---

Optimistic locking protects an entity with an integer version. Every update
compares the version read by the caller with the version currently stored in
the database. A successful update increments it atomically; a stale update
fails instead of overwriting newer data.

## Configure a version field

Add a non-null integer column and reference its logical name from
`optimisticLock`:

```ts
const documentsMetadata = defineTable({
  name: 'documents',
  collectionName: 'documents',
  columns: [
    // Other columns...
    {
      name: 'version',
      columnName: 'version',
      type: 'integer',
      nullable: false,
      primaryKey: false,
      unique: false,
      default: 1,
      validators: []
    }
  ],
  relations: [],
  tableValidators: [],
  optimisticLock: {
    field: 'version',
    initialVersion: 1
  }
})
```

The registry rejects an unknown, nullable or non-integer version field. The
version field cannot declare a write transform.

For an existing table, generate a migration that adds the version column with
a static default so existing rows receive an initial value.

## Update with the version you read

Return the version to the client with the entity:

```ts
const document = await engine.findOne('documents', {
  where: {
    conditions: [{ field: 'id', operator: 'eq', value: documentId }]
  }
})
```

Send that version back in the update patch:

```ts
const updated = await engine.updateOne(
  'documents',
  {
    conditions: [{ field: 'id', operator: 'eq', value: documentId }]
  },
  {
    title: 'Updated title',
    version: document.version
  }
)
```

If `document.version` is `3`, the adapter performs the equivalent of:

```sql
UPDATE documents
SET title = 'Updated title', version = 4
WHERE id = $1 AND version = 3;
```

If another request already changed the row, no row matches `version = 3` and
Persistence throws `OptimisticLockError`.

```ts
import { OptimisticLockError } from '@opensya/persistence'

try {
  await engine.updateOne('documents', byId(documentId), patch)
} catch (error) {
  if (error instanceof OptimisticLockError) {
    // Reload the current entity and ask the user to reconcile the changes.
  }
}
```

Omitting the version from an update throws
`OptimisticLockVersionRequiredError`. Creation always assigns
`initialVersion` (or `1` by default), so callers cannot choose the first
version.

`updateMany()` is also protected, but every selected row must currently have
the version supplied in the shared patch. For independent entity versions,
prefer separate `updateOne()` calls inside an application transaction.
