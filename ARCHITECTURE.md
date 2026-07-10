# OpenSya Persistence Architecture

## Introduction

OpenSya Persistence is the persistence engine behind the OpenSya platform.

Its purpose is not to replace an ORM, nor to provide another query builder. Instead, it provides a single execution engine responsible for orchestrating everything that happens before and after data reaches the database.

The project was born from a simple observation:

> **Accessing data is only a small part of persistence.**

Modern applications spend much more time implementing validation, lifecycle hooks, relationships, transactions, permissions, auditing and other domain rules than writing SQL.

These concerns should not be scattered throughout the application.

They belong to a dedicated persistence layer.

---

# The Problem

Traditional ORMs solve a well-defined problem:

```text
Objects
    ↓
ORM
    ↓
Database
```

They excel at translating objects into SQL.

However, applications usually require additional behaviors:

* validation
* lifecycle hooks
* relationship loading
* authorization
* transactions
* audit logging
* domain events
* multi-tenancy

As an application grows, these responsibilities become distributed across repositories, services, controllers and modules.

Different parts of the application begin implementing the same persistence rules in different ways.

The result is a persistence model that is difficult to understand, difficult to evolve and difficult to keep consistent.

---

# The Solution

OpenSya Persistence introduces a dedicated orchestration layer between the application and the database.

```text
                Application
                      │
                      ▼
          OpenSya Persistence
                      │
                      ▼
           Database Adapter
                      │
                      ▼
                 PostgreSQL
```

Every operation flows through the same execution engine.

Instead of each module implementing its own persistence logic, the engine becomes the single place where persistence rules are executed.

---

# Core Principles

The architecture is built around a small number of fundamental principles.

## 1. Persistence is more than database access

A persistence engine should understand the domain, not only the database.

Validation, relationships, lifecycle hooks and future capabilities all belong to the persistence layer.

Database access is only one responsibility among many.

---

## 2. Metadata is the source of truth

The entire engine is driven by metadata.

A schema does not simply describe tables.

It describes how the domain behaves.

A table definition contains:

* structural information
* validation rules
* relationships
* lifecycle metadata
* future authorization metadata
* future event metadata

This allows every subsystem to rely on the same model.

---

## 3. Business logic is database-independent

The Query Engine never communicates directly with PostgreSQL, Drizzle or any other persistence technology.

It depends only on a small adapter interface.

```text
Query Engine
        │
        ▼
Database Adapter
```

This separation allows the engine to remain independent from the underlying storage implementation.

---

## 4. Consistency before convenience

Every mutation follows exactly the same execution pipeline.

There are no shortcuts.

Every operation behaves identically regardless of where it originates.

This makes persistence predictable throughout the application.

---

# System Overview

```text
                Application
                      │
                      ▼
                Query Engine
                      │
      ┌───────────────┼───────────────┐
      │               │               │
      ▼               ▼               ▼
 Metadata        Hooks System   Relation Resolver
  Registry
      │
      ▼
 Database Adapter
      │
      ▼
 Drizzle Adapter
      │
      ▼
 PostgreSQL
```

Each component has a single responsibility.

---

# Components

## Metadata Registry

The Metadata Registry is responsible for describing the domain.

It contains every table definition known by the application.

The registry is immutable once initialized, guaranteeing that the execution engine always operates on a stable schema.

Responsibilities include:

* storing table definitions
* validating metadata consistency
* exposing metadata to the engine
* preventing invalid schemas from starting

The registry is intentionally independent from the database.

---

## Query Engine

The Query Engine is the heart of the architecture.

It orchestrates every persistence operation.

Its responsibilities include:

* applying default values
* executing lifecycle hooks
* validating entities
* coordinating transactions
* delegating queries to the adapter
* resolving relationships
* providing a consistent execution model

The engine knows nothing about SQL.

It only understands the domain.

---

## Database Adapter

The adapter is the only component aware of the database implementation.

Its responsibilities are intentionally limited.

It translates generic persistence operations into native database operations.

Current implementation:

* Drizzle

Possible future implementations:

* Prisma
* SQLite
* MongoDB
* SurrealDB
* custom adapters

The rest of the engine remains unchanged.

---

## Hooks System

Hooks allow behavior to be attached to persistence operations without modifying the engine itself.

Examples include:

* timestamps
* slug generation
* audit logging
* notifications
* synchronization
* event publishing

Hooks execute inside the same transaction as the persistence operation.

A failing hook aborts the entire mutation.

---

## Relation Resolver

The Relation Resolver is responsible for loading related entities.

Instead of exposing database-specific eager loading strategies, relations are described in metadata and resolved by the engine.

This keeps relationship loading consistent across the application while allowing the underlying adapter to optimize execution.

---

## Consistency Checker

The Consistency Checker compares the declared schema against the actual database schema.

Its purpose is to detect structural drift before the application starts.

Typical checks include:

* missing tables
* missing columns
* unexpected columns
* type mismatches
* nullability differences
* primary key differences

This reduces runtime surprises caused by incomplete migrations.

---

# Execution Pipeline

Every mutation follows the same lifecycle.

```text
Create / Update / Delete

        │

        ▼

Apply defaults

        │

        ▼

Before hooks

        │

        ▼

Validation

        │

        ▼

Database mutation

        │

        ▼

After hooks

        │

        ▼

Commit
```

If any stage fails, the transaction is rolled back.

No partial changes are ever committed.

---

# Safety

OpenSya Persistence intentionally favors explicit behavior.

Operations capable of modifying many records require explicit intent.

For example, bulk updates and deletions are separated from single-entity operations.

This prevents accidental mutations caused by missing or empty filters.

The goal is to make destructive operations impossible by default.

---

# Why Metadata?

Metadata unlocks capabilities far beyond CRUD.

Once the engine understands the domain, additional features can be built without changing application code.

Examples include:

* authorization
* audit logs
* domain events
* generated APIs
* administration interfaces
* type-safe SDKs
* multi-tenancy

Each new capability builds upon the same metadata model instead of introducing another configuration layer.

---

# Future Direction

OpenSya Persistence is intended to become the foundation of data orchestration across the OpenSya ecosystem.

The long-term vision is to describe a domain once and let the engine execute every persistence concern consistently.

Whether the application is built with OpenSya or another TypeScript framework, the persistence model remains identical.

The database becomes an implementation detail.

The domain remains the center of the architecture.
