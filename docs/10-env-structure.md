# 10. `.env` Structure

Documentation of every environment variable the project needs, grouped by concern. This describes the *intended* structure — see the root `.env.example` for the current actual file.

## 10.1 App / runtime

| Variable | Example | Purpose |
|---|---|---|
| `NODE_ENV` | `production` / `development` | Toggles logging verbosity, error detail exposure |
| `PORT` | `3000` | Port the backend listens on inside its container |
| `SITE_DOMAIN` | `myshop.com` / `localhost` | Domain Caddy requests a TLS cert for |

## 10.2 Database

| Variable | Example | Purpose |
|---|---|---|
| `POSTGRES_DB` | `ecommerce` | Database name |
| `POSTGRES_USER` | `ecommerce` | Database user |
| `POSTGRES_PASSWORD` | *(secret)* | Database password — never committed |
| `DATABASE_URL` | `postgres://user:pass@postgres:5432/ecommerce` | Full connection string the backend/ORM uses; usually composed from the three vars above |
| `DATABASE_POOL_MAX` | `10` | Max connections in the pool (see [07-orm-database-connection.md](./07-orm-database-connection.md)) |

## 10.3 Cache / sessions

| Variable | Example | Purpose |
|---|---|---|
| `REDIS_URL` | `redis://redis:6379` | Connection string for the Redis client |
| `SESSION_TTL_SECONDS` | `2592000` (30 days) | How long a guest cart/session survives in Redis |

## 10.4 Auth

| Variable | Example | Purpose |
|---|---|---|
| `JWT_SECRET` | *(secret, long random string)* | Signs/verifies auth tokens |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | Refresh token lifetime |
| `COOKIE_SECRET` | *(secret)* | Signs session cookies, if cookie-based sessions are used instead of/alongside JWT |

## 10.5 Payments

| Variable | Example | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | *(secret)* | Server-side calls to Stripe |
| `STRIPE_WEBHOOK_SECRET` | *(secret)* | Verifies incoming webhook signatures |
| `STRIPE_PUBLISHABLE_KEY` | *(public, exposed to frontend)* | Used by the client-side checkout form |

## 10.6 Email / notifications

| Variable | Example | Purpose |
|---|---|---|
| `SMTP_HOST` | `smtp.provider.com` | Outgoing mail server |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | *(secret)* | |
| `SMTP_PASSWORD` | *(secret)* | |
| `EMAIL_FROM` | `orders@myshop.com` | Sender address on outgoing emails |

## 10.7 Object storage (product images, if not stored on local disk)

| Variable | Example | Purpose |
|---|---|---|
| `S3_ENDPOINT` | `https://<region>.s3.provider.com` | Compatible with S3 API (e.g. Cloudflare R2, Backblaze B2) |
| `S3_BUCKET` | `myshop-product-images` | |
| `S3_ACCESS_KEY_ID` | *(secret)* | |
| `S3_SECRET_ACCESS_KEY` | *(secret)* | |
| `S3_PUBLIC_URL_BASE` | `https://images.myshop.com` | Public base URL served through Cloudflare CDN |

## 10.8 Frontend-only (safe to expose to the browser)

| Variable | Example | Purpose |
|---|---|---|
| `PUBLIC_BACKEND_URL` | `https://myshop.com/api` | Base URL the client-side islands call for cart/search |
| `PUBLIC_STRIPE_KEY` | *(public key, mirrors 10.5)* | Client-side payment form |

## 10.9 Rules

- Anything marked *(secret)* must never be committed — only `.env.example` (with placeholder values) is committed; the real `.env` stays in `.gitignore`.
- Only variables explicitly prefixed for the frontend (e.g. `PUBLIC_*`) are safe to expose to the browser — everything else stays server-side only.
- One `.env` per environment (local, staging, production) — values differ, variable *names* stay the same.
