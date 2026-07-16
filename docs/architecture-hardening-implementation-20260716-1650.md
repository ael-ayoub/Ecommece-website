# Architecture Hardening Implementation — 2026-07-16 16:50

## Executive summary

Implemented the critical v1 transaction and security hardening without changing
the modular-monolith architecture. Checkout now canonicalizes inventory lines,
uses UUID idempotency, commits immutable status history and an outbox event with
the order, and no longer depends on immediate realtime publication. A canonical
terminal order state machine is enforced by the backend and shared with the UI.

This implementation is not claimed as fully production-ready because the
requested disposable-database integration/concurrency suite, account-editing
forms, full pagination scope, graceful process shutdown, and complete
documentation rewrite remain outstanding.

## Critical defects fixed

- Duplicate variant lines are aggregated and sorted before locking, pricing,
  decrement, item creation, and fingerprinting.
- Checkout retries use a unique UUID and safely return the original order.
- Notification failure cannot change a committed checkout response.
- Terminal orders cannot reopen; skipped transitions are rejected.
- Stock restoration occurs only on canonical cancellation/return transitions.
- Nested variant updates verify both product and variant IDs.
- Admin Server Components receive a current database-backed role check.

## Database migration and models

Added `prisma/migrations/20260716190000_architecture_hardening/migration.sql`.
It detects unsafe existing stock/quantity data before adding constraints,
backfills collision-free legacy idempotency values, and does not reset data.

Added `OrderStatusHistory`, `OutboxEvent`, `OrderActorType`, unique order
idempotency fields, history/outbox indexes, and named checks for non-negative
stock/prices/totals and positive order quantities.

## Idempotency and outbox

The browser creates one UUID per attempt and reuses it until checkout succeeds.
The server fingerprints normalized items, identity mode, and delivery/contact
fields. Same-key/same-data returns the original order; changed data returns 409.
The unique database index protects concurrent races.

Mutations write a minimal `{orderId,eventType}` outbox event in their database
transaction. The bounded in-process dispatcher publishes PostgreSQL
notifications, records attempts/errors, and leaves failures pending for retry.

## Order transition matrix

| From      | Allowed destinations |
| --------- | -------------------- |
| PENDING   | CONFIRMED, CANCELLED |
| CONFIRMED | SHIPPED, CANCELLED   |
| SHIPPED   | DELIVERED, RETURNED  |
| DELIVERED | RETURNED             |
| CANCELLED | none                 |
| RETURNED  | none                 |

## Security and pagination

- Encapsulated in-memory rate limits protect login, registration, and checkout.
- 429 responses include `Retry-After`; forwarded IPs require `TRUST_PROXY=true`.
- Cookie-authenticated unsafe requests receive configured Origin/Referer checks.
- Structured logging redacts common secret and personal-data fields.
- Admin layout authorization verifies the current PostgreSQL role.
- Client/admin order APIs use bounded pages (maximum 100), stable ID
  tie-breakers, and return pagination metadata while retaining the legacy
  `orders` key temporarily.

## Realtime and deployment

Realtime remains PostgreSQL `LISTEN/NOTIFY` → Node listener → authenticated SSE
→ React Query invalidation. Docker Compose probes `/api/health`. Production
requires a long-running Node container behind external TLS with private managed
PostgreSQL. Product images remain URL-based; upload and payments are deferred.

## Tests and verification

Unit tests cover duplicate aggregation, deterministic ordering/fingerprints,
aggregate quantity rejection, every status pair, terminal states, and inventory
effect classification.

| Command                                      | Result         |
| -------------------------------------------- | -------------- |
| `npx prisma validate` (safe placeholder URL) | PASS           |
| `npx prisma generate`                        | PASS           |
| `npm run lint`                               | PASS           |
| `npm run typecheck`                          | PASS           |
| `npm run format:check`                       | PASS           |
| `npm run test`                               | PASS — 6 tests |
| `npm run test:unit`                          | PASS — 6 tests |
| `npm run build` (safe build-only env)        | PASS           |

Migration deployment and database integration/concurrency tests were not run
because no disposable PostgreSQL test database was configured. No non-test
database was mutated.

## Remaining known limitations

- No disposable-database constraint, rollback, locking, or concurrency tests.
- Admin clients and bounded nested client-order history are not paginated.
- Account profile/password editing and admin logout UI are not implemented.
- Realtime listener backoff/shutdown cleanup is not fully hardened.
- No comprehensive request-correlation middleware.
- Several detailed specification documents still describe older behavior.
- Outbox claiming is process-local; multi-replica dispatch needs PostgreSQL row
  claiming before horizontal scaling.

## Manual deployment steps

1. Back up the production database.
2. Detect/remediate negative stock or non-positive order quantities.
3. Set the new origin, proxy, rate-limit, locale, currency, and version values.
4. Run `npx prisma migrate deploy` once as a release step.
5. Deploy one long-running app container and verify `/api/health`.
6. Ensure the reverse proxy preserves SSE and is the only trusted forwarded-IP
   source.

## Rollback considerations

An application rollback after migration must support the new required order
columns. Do not drop history or outbox data during emergency rollback; prefer a
corrective forward migration.

## Complete changed-file inventory

- `.env.example`, `README.md`, `docker-compose.yml`, `package.json`
- `docs/architecture.md` and this report
- Prisma schema, seed, and the new additive migration
- checkout/admin/API route files
- canonical checkout and order-status modules
- health, origin, rate-limit, pagination, logger, admin guard, and outbox modules
- inventory, order, product, formatting, validation, and error code
- unit tests under `tests/unit`

Pre-existing unrelated working-tree entries (`docker-compose.dev.yml`,
`Dockerfile.database`, and the architecture audit file) were preserved.
