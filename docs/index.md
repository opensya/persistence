---
title: OpenSya Persistence
description: Learn how to model, validate, query, and inspect data with the OpenSya persistence runtime.
navigation: false
---

# OpenSya Persistence

A metadata-driven persistence runtime for TypeScript applications.

OpenSya Persistence sits between your application and its database adapter. It provides one execution path for validation, lifecycle hooks, relations, transactions, safe mutations, and schema consistency checks.

## Popular

::u-page-grid
  ::u-page-card
  ---
  title: Getting started
  description: Install the package, declare a table, and execute your first query.
  icon: i-tabler-rocket
  to: /getting-started
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  title: Define metadata
  description: Describe tables, columns, defaults, validators, and relations.
  icon: i-tabler-schema
  to: /concepts/metadata-and-registry
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  title: Query data
  description: Read, create, update, and delete data through the Query Engine.
  icon: i-tabler-database
  to: /concepts/query-engine
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  title: Check schema consistency
  description: Compare declared metadata with the live PostgreSQL schema.
  icon: i-tabler-database-search
  to: /guides/schema-consistency
  spotlight: true
  ---
  ::
::

## Core concepts

::u-page-grid
  ::u-page-card{title="Architecture" description="Understand the registry, engine, hooks, resolver, and adapter layers." icon="i-tabler-sitemap" to="/concepts/architecture"}
  ::
  ::u-page-card{title="Queries and filters" description="Compose nested filters, sorting, and pagination." icon="i-tabler-filter" to="/guides/queries-and-filters"}
  ::
  ::u-page-card{title="Validation" description="Apply structural, field-level, and cross-field rules." icon="i-tabler-checkup-list" to="/guides/validation"}
  ::
  ::u-page-card{title="Relations" description="Declare and populate direct relations in batches." icon="i-tabler-link" to="/guides/relations"}
  ::
  ::u-page-card{title="Lifecycle hooks" description="Run domain behavior around transactional mutations." icon="i-tabler-arrows-split" to="/guides/lifecycle-hooks"}
  ::
  ::u-page-card{title="Drizzle adapter" description="Use PostgreSQL through the built-in Drizzle implementation." icon="i-tabler-database-cog" to="/adapters/drizzle"}
  ::
::

## What Persistence does

- validates metadata before the application starts;
- validates entities before inserts and updates;
- wraps mutations and hooks in transactions;
- rejects update and delete operations without effective filters;
- resolves declared relations explicitly and in batches;
- translates generic filters through a database adapter;
- introspects PostgreSQL and reports schema drift.

::u-callout
---
icon: i-tabler-info-circle
color: neutral
variant: subtle
---
Persistence does not create migrations or replace your ORM. It provides the runtime that executes domain rules around database operations.
::
