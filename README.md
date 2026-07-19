# E-Commerce Platform v1

Cash-on-delivery marketplace built as a Next.js 14 modular monolith with
PostgreSQL, Prisma, JWT authentication, explicit Product/SKU combinations, and
SKU-owned inventory.

The repository is split into two operational layers:

- The repository root owns Docker Compose, environment configuration,
  persistent volumes, and lifecycle commands.
- [`ecommerce/`](ecommerce/) is the complete Next.js application package,
  including its Dockerfile, source, Prisma schema/migrations/seed, tests, and
  npm scripts.

See [Docker architecture](docs/docker-architecture.md),
[system architecture](docs/architecture.md), and
[project structure](docs/project-structure.md) for the detailed design.

## Current local architecture

Docker Compose runs two long-lived containers:

| Service | Container | Runtime | Host access |
| --- | --- | --- | --- |
| `db` | `database` | PostgreSQL 15 Alpine | `127.0.0.1:${POSTGRES_PORT:-5432}` |
| `app` | `ecommerce` | Next.js development server on container port `8080` | `http://localhost:3000` |

The app source is bind-mounted from `./ecommerce` to `/app`. Separate named
volumes retain container-managed `node_modules` and `.next` data. PostgreSQL
data is retained in the `db_data` named volume.

At app startup, the container runs:

```text
prisma generate → prisma migrate deploy → next dev
```

The app starts only after PostgreSQL is healthy. Docker checks application
readiness through `http://127.0.0.1:8080/api/health` inside the app container.

## Setup

1. Create the root environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in the required values. In particular:

   - `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`
   - `DATABASE_URL`, using `db:5432` as the hostname from inside Compose
   - `JWT_SECRET`
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   - `APP_ORIGIN=http://localhost:3000`

   Keep the PostgreSQL values and `DATABASE_URL` credentials synchronized.
   Never commit `.env`.

3. Build and start the stack:

   ```bash
   make
   ```

4. Seed the development database:

   ```bash
   make seed
   ```

   The repeatable seed creates or updates the environment-configured admin and
   the development catalog. It does not clear orders, historical snapshots, or
   unrelated data.

5. Open:

   - Storefront: <http://localhost:3000>
   - Health/readiness: <http://localhost:3000/api/health>

## Daily commands

| Command | Purpose |
| --- | --- |
| `make` | Build and start PostgreSQL and the bind-mounted Next.js app |
| `make seed` | Apply the idempotent development seed inside the app container |
| `docker compose ps` | Show container and health status |
| `docker compose logs -f app` | Follow application logs |
| `docker compose exec app npm test` | Run tests inside the application container |
| `make clean` | Stop/remove containers and the Compose network; preserve named volumes |
| `make fclean` | Destructive reset, including the PostgreSQL volume and local images |

Source changes under `ecommerce/` are visible to `next dev` through the bind
mount. Dependency changes require rebuilding the app image/volume:

```bash
docker compose up -d --build --force-recreate app
```

## Prisma commands

Run Prisma inside the app container so it uses the same package, generated
client, schema, Compose network, and `DATABASE_URL` as the application:

```bash
docker compose exec app npm run prisma:generate
docker compose exec app npm run prisma:deploy
docker compose exec app npm run prisma:seed
```

To open Prisma Studio as a temporary development process:

```bash
docker compose run --rm -p 5555:5555 app \
  npm run prisma:studio -- --hostname 0.0.0.0 --port 5555 --browser none
```

Then open <http://localhost:5555>. Stop the foreground command with `Ctrl+C`.
Studio is intentionally not part of the normal Compose stack.

## Deployment boundary

The checked-in Compose/Dockerfile setup is optimized for local development:
it bind-mounts source and runs `next dev`. It is not a production image.

The application’s PostgreSQL `LISTEN/NOTIFY`, transactional outbox dispatcher,
and authenticated SSE path require a long-running Node process. A production
deployment therefore needs a production-built Next.js Node container (or
equivalent persistent Node runtime), managed PostgreSQL, external TLS
termination, secret management, and `prisma migrate deploy` as a release step.
Ordinary short-lived serverless functions are not compatible with that
realtime runtime model.
