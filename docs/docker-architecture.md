# Docker and Container Architecture

This document describes the Docker architecture currently implemented in the
repository. It is the operational source of truth for local development.

## Repository boundary

```text
Ecommece-website/
├── docker-compose.yml       # local service topology
├── Makefile                 # root lifecycle shortcuts
├── .env.example             # root environment contract
├── .env                     # local secrets/configuration; never committed
├── docs/
└── ecommerce/               # complete Next.js application build context
    ├── Dockerfile
    ├── package.json
    ├── prisma/
    ├── public/
    ├── src/
    └── tests/
```

Compose must be run from the repository root. Application npm/Prisma commands
normally run inside the `app` service or from the `ecommerce/` directory.

## Service topology

```text
Browser
  │ http://localhost:3000
  ▼
host TCP 3000
  │ Docker port publication 3000:8080
  ▼
ecommerce container
  Next.js dev server :8080
  │
  │ DATABASE_URL → db:5432
  ▼
database container
  PostgreSQL :5432
  │
  ▼
db_data named volume

ecommerce container
  │ /app/uploads
  ▼
media_uploads named volume
```

`db` is the Compose DNS name used by containers. `localhost` inside the app
container means the app container itself, not PostgreSQL.

## `db` service

- Image: `postgres:15-alpine`
- Container name: `database`
- Internal address: `db:5432`
- Host publication: loopback-only
  `127.0.0.1:${POSTGRES_PORT:-5432}:5432`
- Persistence: `db_data:/var/lib/postgresql/data`
- Health check: `pg_isready` using the configured database and user
- Restart policy: `unless-stopped`

Loopback-only publication allows local database tools while preventing the
development database from listening on every host network interface.

Changing `POSTGRES_*` after the `db_data` volume has already initialized does
not rewrite the existing database credentials. A credential change must be
handled deliberately; deleting `db_data` destroys the development database.

## `app` service

- Build context: `./ecommerce`
- Dockerfile: `ecommerce/Dockerfile`
- Image: `ecommerce:dev`
- Container name: `ecommerce`
- Working directory: `/app`
- Internal port: `8080`
- Host publication: `3000:8080`
- Restart policy: `unless-stopped`
- Init process enabled to forward signals and reap child processes

Startup command:

```sh
npx prisma generate && npx prisma migrate deploy && npm run dev
```

This order guarantees that the Prisma client matches the mounted schema and
all committed migrations are applied before Next.js accepts requests. It does
not run `prisma migrate dev` and does not run the seed automatically.

`APP_ORIGIN` defaults to `http://localhost:3000`, the browser-facing origin.
This is intentionally different from the internal Next.js port and is required
by same-origin mutation protection.

## Mounts and development behavior

| Mount | Purpose |
| --- | --- |
| `./ecommerce:/app` | Makes host source changes available to `next dev` |
| `ecommerce_node_modules:/app/node_modules` | Keeps Linux/container dependencies out of the host bind mount |
| `ecommerce_next:/app/.next` | Keeps Next.js build/cache output container-managed |
| `media_uploads:/app/uploads` | Persists validated Product image binaries across app recreation and rebuilds |

Because `node_modules` is a named volume, changing `package.json` or
`package-lock.json` may require rebuilding/recreating the app container.
Ordinary source edits do not require an image rebuild.

## Startup and readiness

Compose waits for the database health check before starting the app.

The app health check requests:

```text
http://127.0.0.1:8080/api/health
```

The endpoint performs a database query and returns:

- HTTP 200 with `status: ready` when the application can reach PostgreSQL.
- HTTP 503 with `status: unavailable` when the database query fails.

The check uses the container’s internal port. The equivalent browser URL is
<http://localhost:3000/api/health>.

When `docker-compose.yml` changes, an existing container retains its old
effective health check and environment until it is recreated:

```bash
docker compose up -d --no-deps --force-recreate app
```

## Environment contract

Compose reads the root `.env` file for variable interpolation and passes it to
the app through `env_file`. Copy `.env.example` to `.env`; `.env.local` is not
used by the current Compose file.

Important groups:

- PostgreSQL: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
  `POSTGRES_PORT`, `DATABASE_URL`
- Authentication: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- Request security: `APP_ORIGIN`, `ADDITIONAL_ALLOWED_ORIGINS`, `TRUST_PROXY`
- Rate limiting: `RATE_LIMIT_*`
- Display configuration: `APP_CURRENCY`, `APP_LOCALE`, their
  `NEXT_PUBLIC_*` equivalents, and `APP_VERSION`
- Product media: `MEDIA_STORAGE_DRIVER`, `MEDIA_LOCAL_ROOT`,
  `MEDIA_PUBLIC_PATH`, `MEDIA_PUBLIC_BASE_URL`, file/pixel/count limits,
  allowed MIME types, and the upload rate limit

Secrets must stay in `.env` or a deployment secret manager and must never be
committed or copied into the image.

## Prisma lifecycle

The application schema is `ecommerce/prisma/schema.prisma`.

- `prisma generate`: runs at every app-container start.
- `prisma migrate deploy`: applies committed migrations at startup.
- `prisma:seed`: manual and development-only.
- Prisma Studio: manual, temporary, and not exposed by the normal stack.

The seed upserts the configured admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` and
the owned sample catalog. It preserves orders, order snapshots, and unrelated
data. Seeded products are restored to their declared seed state, including
their active status.

Start Studio with:

```bash
docker compose run --rm -p 5555:5555 app \
  npm run prisma:studio -- --hostname 0.0.0.0 --port 5555 --browser none
```

Studio connects through the same `DATABASE_URL` as the app. It should never be
published in production.

## Data-preserving and destructive operations

```bash
docker compose down
```

Stops/removes containers and the network but retains named volumes.

```bash
docker compose down -v
```

Also deletes `db_data`, `ecommerce_node_modules`, `ecommerce_next`, and
`media_uploads`. This destroys the development database and uploaded Product
images and must not be used when data needs to be preserved.

Recreating only the app container does not modify the PostgreSQL volume:

```bash
docker compose up -d --no-deps --force-recreate app
```

## Production boundary

The current Dockerfile and Compose service run `next dev` with a bind-mounted
working tree. They are for local development.

A production deployment requires:

1. A production Next.js build and long-running Node runtime.
2. Managed PostgreSQL reachable over a private or otherwise secured network.
3. `prisma migrate deploy` as a controlled release step.
4. External TLS termination and correct public `APP_ORIGIN`.
5. Platform-managed secrets rather than `.env`.
6. A readiness probe against `/api/health`.
7. Persistent runtime support for PostgreSQL `LISTEN/NOTIFY`, the outbox
   dispatcher, and authenticated SSE.
8. Persistent storage mounted at `MEDIA_LOCAL_ROOT`, backed up consistently
   with PostgreSQL, or a future object-storage adapter.

The current realtime design is not suitable for ordinary short-lived
serverless request functions.
