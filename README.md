# E-Commerce Platform v1

Cash-on-Delivery marketplace — Next.js 14 (App Router, TypeScript), PostgreSQL + Prisma, JWT auth.

See [docs/architecture.md](docs/architecture.md), [docs/admin-dashboard-spec.md](docs/admin-dashboard-spec.md), [docs/client-interface-spec.md](docs/client-interface-spec.md), and [docs/project-structure.md](docs/project-structure.md) for the full design. This README only covers running the project locally.

**Status:** Phase 0 — foundation only. No business logic, no database models, no real pages yet.

## Tech stack (v1)

Next.js 14+ (App Router, TS) · Tailwind CSS + shadcn/ui · React Query · Recharts · PostgreSQL 15+ · Prisma · JWT + bcrypt · Supabase Realtime · Cloudinary · Vercel

## Local development

### Option A — without Docker (Node + a local/remote Postgres)

1. Install dependencies:
   ```
   npm install
   ```
2. Copy the env template and fill in real values:
   ```
   cp .env.example .env.local
   ```
   At minimum, set `DATABASE_URL` to point at a reachable PostgreSQL 15+ database, and set `JWT_SECRET` (generate one with `openssl rand -hex 32`).
3. Generate the Prisma client and apply migrations (none exist yet in Phase 0 beyond the base config):
   ```
   npm run prisma:generate
   ```
4. Start the dev server:
   ```
   npm run dev
   ```
   The app is served at http://localhost:3000.

### Option B — with Docker Compose (Postgres + the app, for local dev only)

1. Copy the env template:
   ```
   cp .env.example .env.local
   ```
   Set `JWT_SECRET`; the `DATABASE_URL` you put here is only used if you run the app _outside_ Docker — inside Compose, the app container is given its own `DATABASE_URL` pointing at the `db` service (see `docker-compose.yml`).
2. Build and start both services:
   ```
   npm run docker:up
   ```
   or directly: `docker compose up -d --build`
3. The app is reachable at http://localhost:3000; Postgres is reachable at `localhost:5432` (for a GUI client) using the `POSTGRES_*` credentials from your `.env.local`.
4. Stop everything with:
   ```
   npm run docker:down
   ```

`Dockerfile.dev` and `docker-compose.yml` are **development-only**. There is no production Dockerfile — see below.

## Useful scripts

| Script                                                               | Purpose                                            |
| -------------------------------------------------------------------- | -------------------------------------------------- |
| `npm run dev`                                                        | Start the Next.js dev server                       |
| `npm run build`                                                      | Production build                                   |
| `npm run lint`                                                       | Run ESLint                                         |
| `npm run format` / `format:check`                                    | Prettier write / check                             |
| `npm run prisma:generate`                                            | Regenerate the Prisma client after a schema change |
| `npm run prisma:migrate`                                             | Create + apply a dev migration                     |
| `npm run prisma:deploy`                                              | Apply existing migrations (production)             |
| `npm run prisma:studio`                                              | Open Prisma Studio                                 |
| `npm run prisma:seed`                                                | Run the seed script                                |
| `npm run docker:up` / `docker:down` / `docker:build` / `docker:logs` | Manage the local Docker Compose stack              |

## How production deployment differs

Production does **not** use Docker or Docker Compose at all — those exist purely to make local development reproducible.

- **Hosting:** the Next.js app (frontend + API routes) deploys to **Vercel**, built directly from the git repository — no container image is built or shipped.
- **Database:** a managed PostgreSQL 15+ instance (not the `postgres:15-alpine` container from `docker-compose.yml`). `DATABASE_URL` points at that managed instance instead of `localhost`/`db`.
- **Migrations:** applied with `prisma migrate deploy` (not `migrate dev`) against the production database, typically as part of the deploy step.
- **Environment variables:** set directly in Vercel's project settings (not read from `.env.local`, which never leaves your machine). See `.env.example` for the full list of variable names required.
- **Real-time / images:** Supabase Realtime and Cloudinary are external managed services in both environments — locally and in production, the app connects to the same hosted services, just with different project credentials.

Full deployment checklist: [docs/architecture.md](docs/architecture.md), Section 18.
