# 1. System Architecture

## 1.1 Layers

```
                              ┌─────────────────────┐
                              │      Visitors        │
                              │  (browser / mobile)   │
                              └──────────┬───────────┘
                                         │ HTTPS
                              ┌──────────▼───────────┐
                              │   Cloudflare (CDN)     │
                              │  caching, DDoS shield  │
                              └──────────┬───────────┘
                                         │
                              ┌──────────▼───────────┐
                              │   Caddy (reverse proxy)│
                              │   TLS, gzip/brotli      │
                              └─────┬────────────┬────┘
                                    │            │
                        /  (pages) │            │ /api/* (JSON)
                                    │            │
                         ┌──────────▼───┐  ┌─────▼──────────┐
                         │   Frontend    │  │    Backend      │
                         │   Astro       │  │  Node + Fastify │
                         │  (storefront +│  │   (REST API)    │
                         │  admin UI)    │  │                 │
                         └───────────────┘  └───┬────────┬────┘
                                                 │        │
                                        ┌────────▼──┐ ┌───▼────┐
                                        │ PostgreSQL │ │ Redis  │
                                        │ (source of │ │ (cache,│
                                        │  truth)    │ │ sessions,
                                        │            │ │ cart)  │
                                        └────────────┘ └────────┘
```

## 1.2 Components

| Component | Role |
|---|---|
| **Cloudflare** | Edge cache for static assets/images, absorbs traffic spikes, free TLS + DDoS protection |
| **Caddy** | Single entry point on the VPS; terminates HTTPS, routes `/api/*` to the backend and everything else to the frontend |
| **Astro (frontend)** | Renders storefront pages (home, category, product, cart, checkout) and the admin UI. Mostly static HTML; only interactive widgets (cart, filters, search) ship JS |
| **Fastify (backend)** | Stateless REST API. Owns all business logic: pricing, stock checks, order creation, auth, admin actions |
| **PostgreSQL** | Single source of truth — products, categories, users, orders, addresses |
| **Redis** | Ephemeral/fast-changing data — session tokens, guest cart contents, cached product listings |

## 1.3 Two entry points, one backend

- **Storefront** (public) — browsing, search, cart, checkout, guest or logged-in customer
- **Admin panel** (restricted, role-gated) — product/category management, order management, user/role management

Both are pages served by the same Astro app, but admin routes require an authenticated session with an elevated role (see [06-roles-permissions.md](./06-roles-permissions.md)). Both call the same backend API and the same database — there is no separate "admin backend."

## 1.4 Why this shape

- **Stateless backend** — any backend container can be scaled horizontally later; session/cart state lives in Redis, not in-process memory.
- **Postgres as single source of truth** — Redis is always a cache/derivative of Postgres, never the only copy of important data (never store an order only in Redis).
- **Reverse proxy in front of two independent services** — frontend and backend can be deployed, restarted, or scaled independently.

## 1.5 Deployment view

All five components run as separate Docker Compose services on one VPS (see root `docker-compose.yml`). Each has its own restart policy and healthcheck so one crashing container doesn't take the whole site down.
