# E-Commerce Platform v1

Cash-on-Delivery marketplace — Next.js 14 (App Router, TypeScript), PostgreSQL + Prisma, JWT auth.

See [docs/architecture.md](docs/architecture.md), [docs/admin-dashboard-spec.md](docs/admin-dashboard-spec.md), [docs/client-interface-spec.md](docs/client-interface-spec.md), and [docs/project-structure.md](docs/project-structure.md) for the full design. This README only covers running the project locally.

**Status:** v1 complete — auth, product catalog, cart, checkout, order management, admin dashboard with real-time updates.

## Tech stack (v1)

Next.js 14+ (App Router, TS) · Tailwind CSS + shadcn/ui · React Query · Recharts · PostgreSQL 15+ · Prisma · JWT + bcrypt · Supabase Realtime · Cloudinary · Vercel

## Local development

The whole stack — Postgres **and** the app — runs in containers, driven by a `Makefile`:

1. Copy the env template and fill in real values:
   ```
   cp .env.example .env.local
   ```
   Set `JWT_SECRET` (generate one with `openssl rand -hex 32`) and `ADMIN_EMAIL`/`ADMIN_PASSWORD` (the login the seed script creates — change these and re-seed any time to change the admin account, no code edit needed). Leave `DATABASE_URL`/`POSTGRES_*` as-is unless you need to change the local Postgres credentials.
2. Build and start everything:
   ```
   make
   ```
   This builds the app image, starts Postgres and the app, and applies any pending migrations automatically on container startup. The app is served at http://localhost:3000; Postgres is reachable at `localhost:5432` for a GUI client.
3. Populate the database with sample data:
   ```
   make seed
   ```

That's the whole loop. Four targets, nothing else:

| Command      | Does                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| `make`       | Build and start the full containerized stack (Postgres + app)             |
| `make seed`  | Run the seed script inside the app container                              |
| `make clean` | Stop and remove the containers — keeps your database volume (your data)   |
| `make fclean`| Full reset: also removes the database volume, built images, `node_modules`, and `.next` — back to a fresh checkout |

Running `npm install` locally afterward is optional — it's only needed for your editor's TypeScript/ESLint tooling, not to run the app, since the container builds its own dependencies independently.

## How production deployment differs

- **Hosting:** the Next.js app (frontend + API routes) deploys to **Vercel**, built directly from the git repository — no container image is built or shipped there. The `Dockerfile`/`docker-compose.yml` here are for local development and for a container-based deployment target, if you use one instead of Vercel.
- **Database:** a managed PostgreSQL 15+ instance in production (not the `postgres:15-alpine` container). `DATABASE_URL` points at that managed instance instead of `db`.
- **Migrations:** applied with `prisma migrate deploy` — the same command the app container already runs on every startup here, just against the production database.
- **Environment variables:** set directly in Vercel's project settings (or your container platform's secrets) — not read from `.env.local`, which never leaves your machine.
- **Real-time / images:** Supabase Realtime and Cloudinary are external managed services in both environments — locally and in production, the app connects to the same hosted services, just with different project credentials.

Full deployment checklist: [docs/architecture.md](docs/architecture.md), Section 18.
