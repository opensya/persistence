# OpenSya Persistence

> **Execute your domain.**
>
> *The persistence engine behind OpenSya.*

OpenSya Persistence is a metadata-driven persistence engine originally built for the OpenSya platform.

It orchestrates validation, relationships, lifecycle hooks and transactions while remaining independent from the underlying database.

Use it with Drizzle today, or implement your own adapter tomorrow.

---

## Why?

ORMs are great at talking to databases.

Applications need much more.

OpenSya Persistence sits between your application and your database to execute your domain consistently.

```text
                Your Application
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

It doesn't replace your ORM.

It gives your ORM a runtime.

---

## Features

* Metadata-driven schema
* Database-independent Query Engine
* Validation
* Lifecycle hooks
* Relationship resolver
* Automatic transactions
* Safe mutations
* Adapter architecture

---

## Installation

```bash
pnpm add @opensya/persistence
pnpm add drizzle-orm
```

---

## Quick Example

```ts
const registry = createMetadataRegistry();

registry.register(users);

registry.lock();

const adapter = createDrizzleAdapter(db);

const engine = createQueryEngine(
    registry,
    adapter,
);

await engine.create("users", {
    email: "john@example.com",
});
```

---

## Documentation

* 📖 Architecture
* 🚀 Getting Started
* 📚 Guides
* 🔌 Adapters
* 🤝 Contributing

👉 **https://opensya.com/persistence**

---

## Roadmap

* Authorization
* Audit Log
* Multi-tenancy
* Domain Events
* Generated APIs

---

## License

MIT
