# Product, Variant, SKU, and Inventory Implementation — 2026-07-16 17:31

## Executive summary

Implemented a SKU-first Product system while preserving the modular monolith,
PostgreSQL inventory locking, checkout idempotency, outbox, and order lifecycle.
Products remain descriptive records; every purchasable unit is an explicit SKU
with authoritative stock.

## Previous Product/Variant problems

- Product type and default-SKU semantics were implicit.
- SKU codes and immutable SKU order snapshots did not exist.
- Products could be created before inventory records.
- Configurable options existed only as free-text labels.
- Admin/storefront logic inferred simplicity from variant count.

## Final Product and SKU rules

- Product has immutable SIMPLE or CONFIGURABLE type and no stock column.
- ProductVariant owns globally unique normalized SKU, stock, optional price
  override, active state, and default flag.
- Simple Products atomically create one hidden default SKU.
- New configurable Products use structured options and unique combinations.
- Effective price is SKU override or Product base price.
- Availability and total stock are derived from active SKUs.

## Schema changes

Added ProductType, Product.productType, ProductVariant.sku, isDefault,
optionCombinationKey, ProductOption, ProductOptionValue,
ProductVariantOptionValue, and OrderItemVariant.skuSnapshot.

Protections include unique SKU, one default SKU per Product, unique option
names/values, unique Product/combination keys, unique Variant/value links,
SKU format/length checks, and existing stock/price/quantity checks.

## Migration behavior and legacy classification

Migration: `prisma/migrations/20260716173000_product_sku_inventory/migration.sql`.

- Zero-variant Products become SIMPLE with an active zero-stock default SKU
  named Default and code `LEGACY-PRODUCT-{id}`.
- One variant is SIMPLE only when its label is unambiguously Default.
- Ambiguous single variants and all multi-variant Products become CONFIGURABLE.
- Existing Variant IDs, prices, stock, active states, and order references are
  preserved.
- Legacy Variants receive deterministic
  `LEGACY-PRODUCT-{productId}-VARIANT-{variantId}` codes.
- Free-text labels are preserved and not guessed into structured options.

## Simple Product implementation

The creation form collects SKU and stock. Product and default SKU commit in one
transaction. Storefront selection is hidden, Add to Cart uses the default
ProductVariant ID, and Product base price is canonical.

## Configurable Product and option implementation

The form collects option names and comma-separated values and generates their
Cartesian combinations. The API accepts structured option/value maps. The
service validates option names, values, SKUs, and unique valid combinations,
then atomically creates Options, Values, SKUs, and association rows.

Structured storefront selectors resolve an exact active/in-stock SKU. Legacy
unstructured Variants retain label-button selection.

## Admin UI changes

- Inventory-type selection during Product creation.
- Simple SKU and stock fields.
- Configurable option builder and generated combination count.
- SKU displayed and required in Variant management.
- Product list displays type, price range, SKU count, derived stock,
  availability, and publication state.
- Edit UI documents Product-type immutability.

## Storefront, cart, checkout, pricing, and inventory

- Simple selector is hidden.
- Structured configurable choices resolve exact SKUs.
- Cards show `From` for differing effective prices and never directly add a
  configurable Product.
- Cart records productVariantId and SKU; legacy local cart rows migrate during
  hydration.
- Checkout continues canonicalizing duplicate SKU lines, locking
  deterministically, and snapshotting server-authoritative price and SKU.
- Cancellation and return restore the exact SKU once.

## Tests added

- SKU/option normalization and deterministic combination generation.
- Price fallback and override.
- Atomic simple/configurable database creation.
- Default-SKU uniqueness and negative-stock rejection.
- Derived total stock and price range.

## Commands and exact results

| Command                                              | Result          |
| ---------------------------------------------------- | --------------- |
| `npx prisma format`                                  | PASS            |
| `npx prisma validate`                                | PASS            |
| `npx prisma generate`                                | PASS            |
| `npx prisma migrate deploy` on disposable PostgreSQL | PASS            |
| `npm run test:integration`                           | PASS — 1 test   |
| `npm run lint`                                       | PASS            |
| `npm run typecheck`                                  | PASS            |
| `npm run format:check`                               | PASS            |
| `npm run test` with disposable PostgreSQL            | PASS — 11 tests |
| `npm run build`                                      | PASS            |

The disposable database contained 2 test Products and 3 test SKUs after the
integration suite. These are generated test records, not migrated production
records.

## Remaining limitations

- Generated configurable SKU rows use suggestions; detailed per-row price and
  stock editing remains on Manage Variants after atomic creation.
- Adding structured combinations to an existing Product does not yet create
  option associations through the legacy add-Variant route.
- No browser automation/UI test framework is installed.
- Migration ran on a fresh disposable database, not a copied legacy dataset.
- A dedicated final-unit checkout concurrency fixture was not added here.

## Products requiring manual legacy review

No legacy Products existed in the disposable database. In production, every
legacy CONFIGURABLE Product without ProductOption rows requires review if
structured selectors are desired. Existing label selectors remain functional.

## Deployment steps

1. Back up PostgreSQL.
2. Review invalid stock/price data and prospective SKU collisions.
3. Run `npx prisma migrate deploy` once as a release step.
4. Review CONFIGURABLE Products without structured Options.
5. Enter stock for zero-variant Products that received default SKUs.
6. Smoke-test Product creation, selection, cart, and checkout.

## Rollback considerations

The migration preserves old IDs and columns, but the new application requires
SKU fields. Do not drop SKU snapshots or option records in an emergency
rollback; prefer a corrective forward migration.

## Complete changed-file inventory

- Prisma schema, seed, and SKU migration
- Product, cart, and order DTOs
- Product domain helpers, validators, service, inventory snapshots, and APIs
- Admin Product form, Variant manager, and Product list
- Storefront Product card/detail/selector, cart hydration, and checkout mapping
- Order item snapshot display
- Product unit/integration tests
- README and Product-related architecture/interface documents
- This implementation report
