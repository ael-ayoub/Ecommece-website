# 7. ORM & Database Connection

## 7.1 Recommendation: Drizzle ORM

For a Node + Fastify + Postgres stack on a small VPS, **Drizzle ORM** is the recommended choice over Prisma:

| | Drizzle | Prisma |
|---|---|---|
| Runtime overhead | Very low — compiles to near-raw SQL | Heavier — separate query engine binary |
| Cold start | Fast | Slower (engine startup) |
| Type safety | Full TypeScript inference from schema | Full, via generated client |
| Migrations | SQL-first, plain `.sql` migration files | Prisma-specific migration format |
| Fit for this project | Matches the "lightweight, cheap VPS, fast" goals from the architecture doc | More features than needed here |

Either is a valid choice; Drizzle is preferred here specifically because it keeps memory/CPU footprint low, which matters on a 1 vCPU / 2GB VPS.

## 7.2 Connection pooling

- The backend opens **one connection pool** at startup (registered as a Fastify plugin, see [03-backend-structure.md](./03-backend-structure.md) → `plugins/db.js`), not a new connection per request.
- Pool size is bounded (e.g. max 10 connections) so a traffic spike can't exhaust Postgres's connection limit — this is one of the specific things that prevents the "crashes under load" failure mode.
- Connection string comes from a single `DATABASE_URL` environment variable (see [10-env-structure.md](./10-env-structure.md)), never hardcoded.

## 7.3 Migrations

- Schema changes are written as versioned migration files (`backend/src/db/migrations/`), never applied by hand against production.
- Each migration is one forward step (add column, add table, add index); rollback migrations are written alongside when the change is risky.
- Migrations run automatically on deploy (before the backend container starts serving traffic) or manually via a one-off command — decide per deployment pipeline, but never let the app auto-alter schema at runtime.

## 7.4 Redis: not an ORM concern, but part of "data access"

Redis is accessed via a plain client (`ioredis`), not an ORM — it's used for:
- Guest cart storage, keyed by session id, with a TTL (e.g. 30 days)
- Caching read-heavy queries (`GET /api/products`, `/api/categories`) with short TTLs (e.g. 60s) and explicit invalidation on admin writes
- Rate-limiting counters

Rule: **Postgres is the source of truth; Redis is always disposable.** If Redis is flushed, nothing important is permanently lost — carts might disappear, but orders and products are untouched.

## 7.5 Repository layer

Controllers and services never write raw SQL/ORM calls directly — they go through a `*.repository.js` module per domain (see [03-backend-structure.md](./03-backend-structure.md)). This keeps the ORM usage isolated to one layer, so the ORM could be swapped later without touching business logic.
