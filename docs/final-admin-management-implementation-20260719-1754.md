# Final Admin Management and Business Rules Implementation

Generated: 2026-07-19 17:54 GMT

## Executive Summary

The existing SKU-first, transaction-oriented architecture was retained and extended to complete production-ready Product, Category, Order, and Customer administration. Products now expose Published/Unpublished lifecycle actions and safe terminal-aware permanent deletion. Customers can be edited, disabled, activated, and safely deleted. Historical orders remain permanent and continue rendering immutable customer, product, variant, pricing, quantity, and shipping snapshots after related live entities are removed.

## Repository Audit

The audit covered the Prisma schema and migrations, authentication/session resolution, checkout and inventory locking, Product/Category/Order/User services, API handlers, admin pages, order rendering, seed behavior, and the existing unit/integration tests.

Existing capabilities reused:

- `Product.isActive` already represented the required two-state Published/Unpublished lifecycle.
- Inventory remained exclusively on `ProductVariant`.
- Checkout already used a transaction, deterministic lock ordering, immutable order-item snapshots, and an outbox.
- Order status transitions and inventory restoration rules were already centralized.
- Order customer/contact/shipping and purchased-product snapshots already existed.
- Historical Product and Variant relations already used nullable foreign keys with `SET NULL`.
- Category deletion already rejected categories containing Products.

The main missing pieces were an active/disabled Customer state, terminal-aware permanent deletion policies, customer-deletion identity snapshots, admin mutation routes and interfaces, disabled-session enforcement, and consistent lifecycle terminology.

## Existing Architecture

- Next.js App Router supplies storefront, admin pages, and API routes.
- Prisma and PostgreSQL provide persistence and transactional business operations.
- Service modules own business rules; route handlers perform authentication, same-origin enforcement, validation, and response mapping.
- Product inventory is SKU-first and Product totals are derived from Variant stock.
- Orders preserve immutable purchased values independently of live catalog entities.
- Checkout locks affected SKUs and now also locks the Customer record when checkout is authenticated.

## Business Rules Implemented

### Products

- `isActive = true` is Published; `false` is Unpublished. No Draft state was added.
- Publish and Unpublish actions replace Archive and Restore terminology and endpoints.
- Only Published Products are storefront-visible and purchasable.
- Permanent deletion is rejected while a Product is referenced by a Pending, Confirmed, or Shipped Order.
- Permanent deletion is allowed when there are no references or all references are terminal (Delivered, Cancelled, Returned).
- Terminal orders retain snapshots; removed live Product/Variant relations become null.
- Order details link to existing Products and display `Product was deleted` without a broken link when absent.

### Categories

- Existing create and edit behavior was retained.
- Empty Categories can be deleted.
- Non-empty Categories are rejected with a count and instructions to move or delete their Products.
- Product cascade deletion was not introduced.

### Orders

- Orders remain permanent; no delete action or endpoint was added.
- The centralized strict transition matrix remains authoritative.
- Only cancellation and return restore stock, exactly once and transactionally.
- Purchased prices, quantities, labels, options, totals, customer contact, and shipping data remain immutable.

### Customers

- Customers support Active and Disabled states.
- Administrators can view, edit, activate, disable, and permanently delete Customers.
- Disabled Customers cannot log in, existing sessions no longer resolve, and authenticated checkout is rejected.
- Checkout locks and revalidates the active Customer inside the order transaction, preventing a disable/delete race.
- Deletion is rejected while any Pending, Confirmed, or Shipped Order exists.
- Deletion is allowed with no Orders or only Delivered, Cancelled, and Returned Orders.
- Historical Orders retain customer snapshots and display `Customer was deleted` when the snapshotted account no longer exists.

## Schema Changes

`User` gained:

- `isActive Boolean @default(true)`
- An index over `(role, isActive)` for administration and authentication filtering.

`Order` gained:

- `customerAccountIdSnapshot Int?`, which distinguishes a deleted registered Customer from a guest order after `userId` becomes null.

Existing nullable `Order.userId`, `OrderItem.productId`, and `OrderItemVariant.productVariantId` relations and `SET NULL` actions were retained.

## Migration Details

Migration: `ecommerce/prisma/migrations/20260719162000_admin_customer_management/migration.sql`

The migration:

1. Adds `User.isActive` with a non-null `true` default.
2. Adds nullable `Order.customerAccountIdSnapshot`.
3. Backfills the snapshot from existing `Order.userId`.
4. Creates the User role/status index.

It is additive and does not rewrite prices, quantities, totals, Product snapshots, shipping snapshots, Orders, or OrderItems.

## API Changes

- Added `PUT /api/products/:id/publish`.
- Added `PUT /api/products/:id/unpublish`.
- Removed the superseded archive/restore handlers.
- Extended `GET /api/admin/clients/:id` with:
  - `PUT` for validated Customer profile/status updates.
  - `DELETE` for terminal-aware permanent deletion.
- Category mutation endpoints now consistently enforce same-origin requests.
- Authenticated order creation rejects invalid or disabled sessions.

All administrative mutations continue requiring Admin authorization.

## Service Changes

- Product service exposes Publish/Unpublish operations and performs locked, terminal-aware deletion reconciliation.
- User service returns explicit safe fields, preventing `passwordHash` from leaking through Customer detail reads.
- User service implements validated updates and locked, terminal-aware deletion.
- Auth service rejects disabled accounts without disclosing account state.
- Current-user resolution invalidates disabled sessions.
- Order service snapshots the registered Customer ID and locks/revalidates the active Customer during checkout.
- Category service returns a human-readable non-empty deletion error including the Product count.

## UI Changes

- Products use Published/Unpublished labels and Publish/Unpublish actions.
- Product deletion confirmations explain active-order restrictions and historical snapshot preservation.
- Category deletion warns about Product membership and renders service errors accessibly.
- Customer list shows status.
- Customer details support profile edits, activation/disable, activity/order history, and typed-email permanent-delete confirmation.
- Admin Order details link existing Customers and Products to their admin details.
- Deleted Customers and Products render explicit non-link messages.
- Order details include customer, products, quantities, purchased prices, totals, shipping, payment, timeline, and current status.

## Snapshot Strategy

Historical rendering uses the existing immutable Order and OrderItem values:

- Customer name, email, phone, and full shipping address.
- Product name and image snapshot.
- SKU, Variant label, selected option names/values.
- Unit price, quantity, and persisted order totals.

The new `customerAccountIdSnapshot` records that the order originally belonged to a registered Customer without duplicating the existing contact snapshots.

Live relations are used only for optional navigation. They are not used to recalculate or replace historical values.

## Referential Integrity Review

- Orders and OrderItems are never cascade-deleted by Product, Variant, or Customer deletion.
- Customer deletion sets `Order.userId` to null.
- Product deletion sets `OrderItem.productId` to null.
- Variant deletion sets `OrderItemVariant.productVariantId` to null.
- Category deletion is blocked by its Product relationship rather than cascading Products.
- Active business operations block Product/Customer permanent deletion.
- Terminal Order records retain all financial and purchased-data snapshots.

## Test Coverage

New or updated integration coverage verifies:

- Product Publish/Unpublish storefront and inventory behavior.
- Product deletion rejection for active Orders.
- Terminal Product deletion and immutable historical snapshots.
- Empty Category deletion and non-empty Category rejection.
- Customer edit, Disable, rejected login, Activate, and successful login.
- Customer deletion with no Orders.
- Customer deletion rejection with active Orders.
- Terminal Customer deletion and preserved customer/product/order snapshots.

Existing unit coverage verifies valid/invalid status transitions, terminal-state immutability, inventory restoration rules, checkout aggregation, explicit combinations, option limits, SKU behavior, and price overrides.

## Verification Results

All required checks passed:

- `prisma format`
- `prisma validate`
- `prisma generate`
- `prisma migrate deploy` — 6 migrations, no pending migrations
- `npm run lint` — no warnings or errors
- `npm run typecheck`
- `npm run test` — 20/20 passed
- `npm run test:unit` — 16/16 passed
- `npm run test:integration` — 4/4 passed
- `npm run build` — completed successfully
- `git diff --check`
- Docker database container healthy
- Docker application container healthy
- `/api/health` returned `ready` with database `connected`

The build retains known non-fatal `jose` Edge Runtime compatibility warnings. Static generation also logs handled API request failures while no runtime server is available during build; page generation and the build complete successfully.

## Files Modified

Primary functional areas:

- `ecommerce/prisma/schema.prisma`
- `ecommerce/prisma/seed.ts`
- `ecommerce/prisma/migrations/20260719162000_admin_customer_management/migration.sql`
- `ecommerce/src/services/{auth,category,order,product,user}.service.ts`
- `ecommerce/src/lib/get-current-user.ts`
- `ecommerce/src/lib/validators.ts`
- `ecommerce/src/app/api/admin/clients/[id]/route.ts`
- `ecommerce/src/app/api/categories/**`
- `ecommerce/src/app/api/orders/route.ts`
- `ecommerce/src/app/api/products/[id]/{publish,unpublish}/route.ts`
- `ecommerce/src/app/admin/categories/page.tsx`
- `ecommerce/src/app/admin/clients/**`
- `ecommerce/src/app/admin/orders/[id]/page.tsx`
- `ecommerce/src/app/admin/products/page.tsx`
- `ecommerce/src/components/orders/OrderItemsTable.tsx`
- `ecommerce/src/types/{auth,client,order}.ts`
- `ecommerce/tests/integration/{admin-management,product-lifecycle}.integration.test.ts`
- `docs/{architecture,admin-dashboard-spec,project-structure}.md`

Formatting was normalized in existing touched TypeScript/TSX sources; business behavior outside the areas above was not redesigned.

## Deployment Steps

1. Back up the production PostgreSQL database.
2. Deploy the application code and migration files together.
3. Run `npx prisma migrate deploy --schema prisma/schema.prisma`.
4. Generate Prisma Client as part of the image/build process.
5. Deploy the built application.
6. Verify `/api/health`, Admin authentication, Product publish state, Customer disable behavior, and a controlled checkout.
7. Monitor rejected deletion and checkout logs after release.

Do not run the development seed against production.

## Rollback Considerations

- Prefer application roll-forward if a defect is found after migration.
- The schema additions are backward-compatible with the preceding application version.
- Do not drop `customerAccountIdSnapshot` until all deployed application versions no longer reference it.
- If a database rollback is unavoidable, preserve a backup first; dropping the snapshot column loses deleted-account provenance but does not alter the existing customer/contact/shipping snapshots.
- Product or Customer deletions already committed cannot recreate live entities automatically; historical Orders remain intact.

## Remaining Recommendations

- Replace browser-native `confirm`/`prompt` controls with the future design system's accessible modal components during the UI/UX phase.
- Review or upgrade the Edge-compatible `jose` import path to remove the existing build warnings.
- Consider adding browser-level tests for disabled-session redirects and deleted-entity link presentation once an end-to-end test harness is selected.
- Consider suppressing expected build-time API fetch logging or marking those pages explicitly dynamic to reduce non-actionable build logs.
