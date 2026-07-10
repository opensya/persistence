---
seo:
  title: OpenSya Persistence
  description: A metadata-driven persistence engine for TypeScript applications.
---

::u-page-hero{orientation="horizontal"}
#title
Execute your [domain]{.text-primary}.

#description
OpenSya Persistence is a metadata-driven persistence engine that orchestrates validation, relationships, lifecycle hooks, and transactions while keeping your application independent from the underlying database.

#links
  :::u-button
  ---
  label: Get started
  to: /getting-started
  size: xl
  trailing-icon: i-tabler-arrow-right
  ---
  :::

  :::u-button
  ---
  label: View on GitHub
  to: https://github.com/opensya/persistence
  target: _blank
  color: neutral
  variant: outline
  size: xl
  icon: i-tabler-brand-github
  ---
  :::

#default
  :::prose-pre
  ---
  code: |
    const registry = createMetadataRegistry()

    registry.register(users)
    registry.lock()

    const adapter = createDrizzleAdapter(db)

    for (const table of registry.getAll()) {
      adapter.buildTable(table)
    }

    const engine = createQueryEngine(registry, adapter)

    await engine.create('users', {
      email: 'john@example.com'
    })
  filename: persistence.ts
  ---
  ```ts
  const registry = createMetadataRegistry()

  registry.register(users)
  registry.lock()

  const adapter = createDrizzleAdapter(db)

  for (const table of registry.getAll()) {
    adapter.buildTable(table)
  }

  const engine = createQueryEngine(registry, adapter)

  await engine.create('users', {
    email: 'john@example.com'
  })
  ```
  :::
::

::u-page-section
#title
More than database access

#description
Your ORM communicates with the database. OpenSya Persistence gives it a runtime for executing domain rules consistently.

#features
  :::u-page-feature
  ---
  icon: i-tabler-schema
  ---
  #title
  Metadata-driven schema

  #description
  Describe tables, columns, validation rules, and relations once through a database-independent metadata model.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-shield-check
  ---
  #title
  Safe mutations

  #description
  Update and delete operations require explicit filters, preventing accidental unbounded mutations.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-checkup-list
  ---
  #title
  Built-in validation

  #description
  Combine structural checks with synchronous or asynchronous field and table validators.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-arrows-split
  ---
  #title
  Lifecycle hooks

  #description
  Transform data and execute application behavior before and after create, update, and delete operations.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-link
  ---
  #title
  Relationship resolver

  #description
  Populate one-to-one, one-to-many, many-to-one, and many-to-many relations through batched queries.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-transaction-dollar
  ---
  #title
  Automatic transactions

  #description
  Mutations, validation, and lifecycle hooks execute inside the same adapter transaction.
  :::
::

::u-page-section
#title
One runtime, replaceable adapters

#description
The Query Engine depends on a small database adapter contract. Use the built-in Drizzle PostgreSQL adapter today or implement another adapter for your own infrastructure.

#links
  :::u-button
  ---
  label: Explore the architecture
  to: /concepts/architecture
  color: neutral
  variant: subtle
  size: lg
  trailing-icon: i-tabler-arrow-right
  ---
  :::

#features
  :::u-page-feature
  ---
  icon: i-tabler-engine
  ---
  #title
  Query Engine

  #description
  A single API coordinates reads, relation population, defaults, validation, hooks, and transactional mutations.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-database-cog
  ---
  #title
  Adapter architecture

  #description
  Persistence targets the DatabaseAdapter interface instead of coupling domain operations to a specific ORM.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-brand-typescript
  ---
  #title
  TypeScript first

  #description
  The public API, metadata contracts, filters, hooks, and custom adapter interfaces are fully typed.
  :::
::

::u-page-section
#title
A predictable mutation pipeline

#description
Every mutation follows the same execution order so domain rules cannot be accidentally bypassed.

::u-steps{level="3"}
### Apply defaults
Missing values declared in column metadata are resolved before validation.

### Run before hooks
Registered hooks can normalize, enrich, authorize, or reject the incoming mutation.

### Validate the entity
Structural rules, field validators, and cross-field table validators run before writing.

### Execute the mutation
The transaction-scoped adapter inserts, updates, or deletes the targeted records.

### Run after hooks
Post-mutation behavior executes before the transaction is committed.
::

::u-callout
---
icon: i-tabler-shield-lock
color: primary
variant: subtle
title: Safe by default
---
An update or delete without a non-empty filter is rejected with `UnsafeMutationError`.
::

#links
  :::u-button
  ---
  label: Learn about validation
  to: /guides/validation
  color: neutral
  variant: outline
  trailing-icon: i-tabler-arrow-right
  ---
  :::

  :::u-button
  ---
  label: Explore lifecycle hooks
  to: /guides/lifecycle-hooks
  color: neutral
  variant: outline
  trailing-icon: i-tabler-arrow-right
  ---
  :::
::

::u-page-section
#title
Explore the documentation

#features
  :::u-page-feature
  ---
  icon: i-tabler-rocket
  to: /getting-started
  ---
  #title
  Getting started

  #description
  Install the package, declare metadata, initialize the registry, and execute your first query.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-binary-tree
  to: /concepts/metadata-and-registry
  ---
  #title
  Metadata and registry

  #description
  Understand the schema model, supported column types, defaults, and startup validation.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-filter
  to: /guides/queries-and-filters
  ---
  #title
  Queries and filters

  #description
  Build nested filters, order results, paginate queries, and perform safe mutations.
  :::

  :::u-page-feature
  ---
  icon: i-tabler-plug-connected
  to: /adapters/drizzle
  ---
  #title
  Drizzle adapter

  #description
  Connect the Query Engine to PostgreSQL through the built-in Drizzle adapter.
  :::
::

::u-page-section
  :::u-page-c-t-a
  ---
  title: Ready to execute your domain?
  description: Build a consistent persistence layer with metadata, validation, hooks, relationships, and transactions.
  links:
    - label: Get started
      to: /getting-started
      trailingIcon: i-tabler-arrow-right
    - label: View on GitHub
      to: https://github.com/opensya/persistence
      target: _blank
      variant: subtle
      icon: i-tabler-brand-github
  ---
  :::
::
