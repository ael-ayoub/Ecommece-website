# 3. Backend Structure

Node.js + Fastify. Layered structure: **routes → controllers → services → repositories → database**. Each layer only talks to the layer directly below it.

```
backend/
├── src/
│   ├── index.js                 # entry point: builds Fastify app, registers plugins, starts server
│   ├── app.js                   # Fastify instance assembly (separated from listen() for testability)
│   │
│   ├── config/
│   │   ├── env.js               # reads & validates process.env once, exports typed config object
│   │   └── constants.js         # order statuses, roles, pagination defaults, etc.
│   │
│   ├── plugins/                 # Fastify plugins (cross-cutting infrastructure)
│   │   ├── db.js                # registers Postgres pool / ORM client as app.db
│   │   ├── redis.js             # registers Redis client as app.redis
│   │   ├── auth.js              # JWT/session verification, decorates request.user
│   │   ├── cors.js
│   │   └── error-handler.js     # centralized error → HTTP response mapping
│   │
│   ├── modules/                 # one folder per business domain (feature-based, not layer-based at top level)
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.schema.js   # request/response validation schemas
│   │   ├── products/
│   │   │   ├── products.routes.js
│   │   │   ├── products.controller.js
│   │   │   ├── products.service.js
│   │   │   ├── products.repository.js
│   │   │   └── products.schema.js
│   │   ├── categories/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── users/
│   │   └── admin/
│   │       ├── dashboard/
│   │       └── users/
│   │
│   ├── middleware/
│   │   ├── require-auth.js      # blocks request if not logged in
│   │   ├── require-role.js      # blocks request unless user has role X
│   │   └── rate-limit.js
│   │
│   ├── db/
│   │   ├── migrations/          # ORM migration files (see 07-orm-database-connection.md)
│   │   └── seed.js              # dev/demo seed data
│   │
│   └── utils/
│       ├── logger.js
│       ├── pagination.js
│       └── slugify.js
│
├── tests/
│   ├── unit/                    # service-level tests, DB mocked
│   └── integration/             # route-level tests against a test DB
│
├── Dockerfile
└── package.json
```

## 3.1 Responsibility per layer

| Layer | Responsibility | Must NOT do |
|---|---|---|
| **routes** | Define path + HTTP method, attach schema validation, wire to controller | Contain business logic |
| **controller** | Parse request, call service, shape HTTP response | Talk to the database directly |
| **service** | Business rules (stock checks, price calculation, order state transitions) | Know about HTTP (`req`/`res`) |
| **repository** | Raw data access (queries via the ORM) | Contain business rules |
| **schema** | Validate/serialize request and response shapes | — |

## 3.2 Request lifecycle example — `POST /api/checkout`

1. `routes` validates the request body against `orders.schema.js`
2. `controller` extracts cart id / user id from the request
3. `service` (`orders.service.js`):
   - loads cart from `cart.repository`
   - re-checks stock and price against `products.repository` (never trust client-sent prices)
   - creates order + order_items via `orders.repository` inside a DB transaction
   - calls `payments` module to create a payment intent
4. `controller` returns the order id + payment client secret
5. Later, `payments.webhook` route confirms payment and the `orders.service` transitions the order to `paid`

## 3.3 Cross-cutting concerns

- **Auth** — `plugins/auth.js` runs on every request, attaches `request.user` if a valid token/session is present. `middleware/require-role.js` is applied per-route for admin-only endpoints.
- **Validation** — every route declares a Fastify JSON schema; invalid input never reaches a controller.
- **Error handling** — one central `error-handler.js` plugin converts thrown errors (e.g. `NotFoundError`, `ValidationError`, `OutOfStockError`) into consistent JSON error responses.
- **Caching** — read-heavy endpoints (`GET /api/products`, `/api/categories`) check Redis before hitting Postgres; writes (admin create/update) invalidate the relevant cache keys.
