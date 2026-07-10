---
title: Documentation
description: Browse the OpenSya Persistence documentation.
navigation: false
---

# Documentation

## Start here

::u-page-grid
  ::u-page-card{title="Getting started" description="Create a complete runtime and execute your first operation." icon="i-tabler-rocket" to="/getting-started"}
  ::
  ::u-page-card{title="Architecture" description="Understand responsibilities and execution paths." icon="i-tabler-sitemap" to="/concepts/architecture"}
  ::
::

## Concepts

::u-page-grid
  ::u-page-card{title="Metadata and registry" description="Declare and validate the persistence model." icon="i-tabler-schema" to="/concepts/metadata-and-registry"}
  ::
  ::u-page-card{title="Query Engine" description="Read and mutate entities transactionally." icon="i-tabler-engine" to="/concepts/query-engine"}
  ::
::

## Guides

::u-page-grid
  ::u-page-card{title="Queries and filters" description="Compose filters, sorting, and pagination." icon="i-tabler-filter" to="/guides/queries-and-filters"}
  ::
  ::u-page-card{title="Validation" description="Implement structural and domain validation." icon="i-tabler-checkup-list" to="/guides/validation"}
  ::
  ::u-page-card{title="Relations" description="Declare and populate direct relationships." icon="i-tabler-link" to="/guides/relations"}
  ::
  ::u-page-card{title="Lifecycle hooks" description="Execute ordered behavior around mutations." icon="i-tabler-arrows-split" to="/guides/lifecycle-hooks"}
  ::
  ::u-page-card{title="Schema consistency" description="Compare metadata with live PostgreSQL." icon="i-tabler-database-search" to="/guides/schema-consistency"}
  ::
::

## Adapters and status

::u-page-grid
  ::u-page-card{title="Drizzle adapter" description="PostgreSQL execution and introspection." icon="i-tabler-database-cog" to="/adapters/drizzle"}
  ::
  ::u-page-card{title="Current limitations" description="Review the boundaries of version 0.0.1." icon="i-tabler-barrier" to="/current-limitations"}
  ::
::
