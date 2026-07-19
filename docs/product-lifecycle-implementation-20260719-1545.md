# Product Lifecycle, Safe Deletion, and Order Snapshot Implementation

Date: 2026-07-19 15:45 (Africa/Nouakchott)

## Executive summary

The catalog now has three explicit lifecycle operations: Archive, Restore, and
Delete permanently. Archive is the normal reversible operation and does not
change SKU inventory. Permanent deletion is restricted to Products that have
never appeared in an order. Ordered Products are retained and may remain
archived indefinitely so cancellation and return can continue restoring stock
to the original SKU.

Checkout now freezes the Product image and structured option selections in
addition to the existing Product name, SKU, variant label, unit price, and
quantity snapshots. Historical order rendering uses those snapshots and labels
a missing live Product without producing a broken link.

## Repository audit

The repository already provided:

- `Product.isActive` and public Product filtering.
- Server-authoritative SKU inventory and effective pricing.
- Checkout locking, idempotency, transactional order creation, and outbox
  events.
- Nullable `OrderItem.productId` and
  `OrderItemVariant.productVariantId` relations with `onDelete: SetNull`.
- Product name, SKU, variant label, unit price, quantity, and order-total
  snapshots.
- Cancellation/return stock restoration through the live ProductVariant ID.

The previous DELETE endpoint only set `Product.isActive = false`, while the
admin UI called that operation “Delete” and continued displaying the inactive
row. There was no Restore endpoint and no guarded permanent-delete operation.

## Existing behavior retained

- SKU-first inventory and Product base-price/SKU override behavior.
- Explicit configurable Product combinations.
- Product/SKU activity checks during checkout.
- Canonical inventory locks and non-negative stock enforcement.
- Checkout idempotency and authoritative price calculation.
- Immutable existing commercial snapshots.
- Order history and status history.
- Transactional outbox and SSE realtime path.
- Cancellation and return inventory restoration.

## Chosen deletion strategy

The implementation uses the reject-delete strategy for ordered Products.

An unordered Product can be permanently deleted with its SKU and option-owned
catalog rows. An ordered Product returns HTTP 409 and must be archived instead.

## Rationale

Although live Order relations are already nullable and historical rendering can
survive missing catalog records, inventory restoration still needs the original
ProductVariant. Deleting an ordered SKU before a Pending/Confirmed order is
cancelled or a shipped/delivered order is returned would make correct
restoration impossible. Retaining ordered Products is therefore safer and more
consistent with the existing inventory architecture than relying solely on
nullable snapshot relations.

Product and SKU locks also close archive/delete versus checkout races. Checkout
locks involved Products in canonical ID order before locking variants.
Archive/delete lock the Product before mutation. After archive or deletion
returns, checkout cannot commit using stale Product activity.

## Schema changes

Two nullable, additive snapshot fields were added:

- `OrderItem.imageSnapshot String?`
- `OrderItemVariant.optionValuesSnapshot Json?`

No existing snapshot was duplicated. Discounts and taxes are not modeled in
v1. Line subtotal remains exactly derivable from immutable unit price and
quantity; `Order.totalAmount` remains the immutable order total.

The existing nullable Product and ProductVariant convenience relations and
their `SetNull` referential actions were retained. No relation can cascade from
a Product or ProductVariant to delete an OrderItem.

## Migration details

Migration:

`20260719150000_product_lifecycle_snapshots`

The migration:

1. Adds the two nullable columns.
2. Backfills the first Product image for linked historical rows where present.
3. Backfills ordered structured option selections from existing Product option
   associations where present.

It does not recreate tables, reset sequences, remove rows, or modify existing
commercial snapshot values.

## API changes

- `POST /api/products/:id/archive`
  - Admin-only and same-origin protected.
  - Sets Product active state to false under a row lock.
- `POST /api/products/:id/restore`
  - Admin-only and same-origin protected.
  - Sets Product active state to true.
- `DELETE /api/products/:id`
  - Now means permanent deletion.
  - Admin-only and same-origin protected.
  - Returns 409 when Product or SKU order history exists.
  - Deletes only Product-owned catalog records in one transaction.

Public Product list/search/category/detail behavior continues to exclude
archived Products through the central Product service. Admin reads can include
archived Products.

## Checkout changes

Checkout continues accepting only variant IDs and quantities from the browser.
Names, images, SKU codes, labels, option selections, and prices are loaded from
the database.

The inventory service now:

1. Canonicalizes and locks involved Product rows.
2. Locks SKU rows.
3. Validates Product activity, SKU activity, and stock.
4. Calculates effective server-authoritative price.
5. Captures Product name/image and SKU/label/structured-option snapshots.
6. Decrements inventory inside the caller’s order transaction.

Archived Product checkout fails with the existing cart-unavailable conflict and
does not decrement inventory.

## UI changes

The admin Product list now shows:

- Active or Archived status.
- Archive for active Products.
- Restore for archived Products.
- A separate danger-styled Delete permanently action.

Archive has a reversible-action confirmation. Permanent deletion requires the
administrator to type the exact Product name and warns that Products and SKUs
will be removed irreversibly. API business errors are displayed in an
accessible alert.

Order item rendering continues using snapshots. If the optional live Product
relation is missing, it displays “Product no longer available” and does not
render a broken catalog link. Structured purchased options render from the new
JSON snapshot.

## Inventory behavior

- Archive does not change, reserve, restore, or decrement stock.
- Restore does not change stock.
- Permanent deletion performs no inventory adjustment; it is limited to
  never-ordered catalog rows.
- Archived Product checkout is rejected before decrement.
- Ordered Products cannot be deleted, preserving future cancellation/return
  restoration.
- Existing cancellation and return paths remain unchanged.

## Test coverage

The new integration test covers:

- Archive and Restore.
- Public hiding and admin retrieval of archived Products.
- Archive stock invariance.
- Rejected archived checkout and stock invariance.
- Permanent deletion of a never-ordered Product and SKU.
- Rejection of permanent deletion for an ordered Product.
- Server-authoritative snapshots.
- Snapshot invariance after Product rename, SKU rename, label edit, price
  change, and archive.
- Cancellation stock restoration after catalog edits and archive.

The npm test globs were corrected so Node/tsx receives actual test files rather
than a literal unsupported `**` path.

## Verification results

- `prisma format`: passed.
- `prisma validate`: passed.
- `prisma generate`: passed.
- `prisma migrate deploy` against development: passed; migration applied.
- Fresh migration deploy against disposable
  `ecommerce_lifecycle_test_20260719`: passed.
- `npm run lint`: passed with no warnings or errors.
- `npm run typecheck`: passed.
- `npm run test`: passed with 19/19 tests when run against the isolated
  integration database.
- `npm run test:unit`: passed with 16/16 tests.
- `npm run test:integration`: passed with 3/3 tests.
- `npm run build`: passed and generated Archive/Restore routes.
- Final Compose status: PostgreSQL and application containers healthy;
  `/api/health` returned HTTP 200 with database connected.

The first combined build emitted existing `jose` Edge Runtime
CompressionStream/DecompressionStream warnings. A separate final build
completed successfully. During static generation the application logged
existing API request errors for data-dependent pages, but the build completed
with exit status 0.

## Files modified

- `ecommerce/prisma/schema.prisma`
- `ecommerce/prisma/migrations/20260719150000_product_lifecycle_snapshots/migration.sql`
- `ecommerce/src/services/product.service.ts`
- `ecommerce/src/services/inventory.service.ts`
- `ecommerce/src/services/order.service.ts`
- `ecommerce/src/app/api/products/[id]/route.ts`
- `ecommerce/src/app/api/products/[id]/archive/route.ts`
- `ecommerce/src/app/api/products/[id]/restore/route.ts`
- `ecommerce/src/app/admin/products/page.tsx`
- `ecommerce/src/components/orders/OrderItemsTable.tsx`
- `ecommerce/src/types/order.ts`
- `ecommerce/tests/integration/product-lifecycle.integration.test.ts`
- `ecommerce/package.json`
- `docs/architecture.md`
- `docs/admin-dashboard-spec.md`
- `docs/project-structure.md`
- This report

The pre-existing deletion of `docs/client-interface-spec.md` was not part of
this implementation and was left untouched.

## Deployment steps

1. Back up the target PostgreSQL database.
2. Deploy the application and migration together.
3. Run `npx prisma migrate deploy` against the target database.
4. Run `npx prisma generate` during the application build.
5. Start the long-running Next.js Node runtime.
6. Verify `/api/health`.
7. Verify an Archive/Restore cycle on a noncritical Product.
8. Verify permanent deletion succeeds for a newly created unordered Product.
9. Verify permanent deletion returns 409 for an ordered Product.
10. Verify an archived Product already present in a cart fails checkout.

Do not run the development catalog seed in production unless its catalog
upsert behavior is explicitly intended.

## Rollback considerations

The migration is additive and the new fields are nullable, so the previous
application version can run with the columns still present. This is the safest
application rollback.

Dropping the new columns would discard newly captured image and option
snapshots and is not recommended. If absolutely required, first retain a
database backup and confirm no rollback consumer needs those snapshots.

Rolling back only the application would restore the old DELETE-as-archive
semantics; operators must be informed before using an older admin UI.

## Remaining recommendations

- Manually exercise the native browser confirm/prompt experience and replace it
  with the project’s accessible dialog primitives if richer focus management
  is desired.
- Resolve the existing `jose` Edge Runtime build warnings independently.
- Investigate existing build-time API error logs for data-dependent static
  generation.
- Review the dependency audit separately: rebuilding the development image
  reported five existing npm vulnerabilities (one moderate, four high). Do not
  apply a forced major-version upgrade without compatibility testing.
- Add a dedicated concurrent archive-versus-checkout stress test if the
  integration environment gains deterministic multi-connection orchestration.
