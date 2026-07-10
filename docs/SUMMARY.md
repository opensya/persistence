---
title: Documentation
description: Explore the complete OpenSya Persistence documentation.
navigation: false
---

# OpenSya Persistence documentation

Choose a topic to start exploring the persistence runtime.

## Get started

::u-page-grid
  ::u-page-card
  ---
  title: Introduction
  description: Discover the purpose and core capabilities of OpenSya Persistence.
  icon: i-tabler-home
  to: /
  spotlight: true
  ---
  ::

  ::u-page-card
  ---
  title: Getting started
  description: Install the package and execute your first query.
  icon: i-tabler-rocket
  to: /getting-started
  spotlight: true
  ---
  ::
::

## Concepts

::u-page-grid
  ::u-page-card{title="Architecture" description="Runtime layers, responsibilities, and mutation pipelines." icon="i-tabler-sitemap" to="/concepts/architecture"}
  ::
  ::u-page-card{title="Metadata and registry" description="Schema declarations, defaults, and startup validation." icon="i-tabler-schema" to="/concepts/metadata-and-registry"}
  ::
  ::u-page-card{title="Query Engine" description="Application-facing reads and transactional mutations." icon="i-tabler-engine" to="/concepts/query-engine"}
  ::
::

## Guides

::u-page-grid
  ::u-page-card{title="Queries and filters" description="Operators, boolean groups, ordering, and pagination." icon="i-tabler-filter" to="/guides/queries-and-filters"}
  ::
  ::u-page-card{title="Validation" description="Structural, field, and cross-field validation." icon="i-tabler-checkup-list" to="/guides/validation"}
  ::
  ::u-page-card{title="Relations" description="Declare and explicitly populate direct relations." icon="i-tabler-link" to="/guides/relations"}
  ::
  ::u-page-card{title="Lifecycle hooks" description="Run behavior around transactional mutations." icon="i-tabler-arrows-split" to="/guides/lifecycle-hooks"}
  ::
::

## Adapters and project status

::u-page-grid
  ::u-page-card{title="Drizzle adapter" description="Connect the Query Engine to PostgreSQL." icon="i-tabler-brand-drizzle" to="/adapters/drizzle"}
  ::
  ::u-page-card{title="Current limitations" description="Review the boundaries of version 0.0.1." icon="i-tabler-barrier" to="/current-limitations"}
  ::
::
