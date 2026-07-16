# Product Option Template Configurator Implementation — 2026-07-16 19:50

## Executive summary

Implemented reusable SYSTEM and User-owned option presets plus the approved
seller-facing configurable Product workflow. Templates are reusable starting
points; Products always own independent ProductOption copies and exact SKU
inventory.

## Previous configuration problems

The prior flow required raw option text, generated every SKU immediately with
zero stock, exposed SKU complexity early, had no recommendations or saved
presets, and did not distinguish allocation planning from Product stock.

## Final template architecture

OptionTemplate and OptionTemplateValue store reusable presets.
OptionTemplateCategory stores deterministic recommendations.
UserOptionTemplatePreference stores pin, usage count, and last-used time.
SYSTEM templates have no owner and are read-only. USER templates belong to one
database-backed admin User.

Products have no template foreign key. Activating a template copies selected
display values into the unsaved draft; successful Product creation writes new
ProductOption and ProductOptionValue rows. Later template edits or deletion
cannot change Products, Variants, stock, orders, or snapshots.

## Database models and constraints

Migration:
`prisma/migrations/20260716180000_option_templates_configurator/migration.sql`.

Added OptionTemplateOwnerType, OptionInputType, OptionTemplate,
OptionTemplateValue, OptionTemplateCategory, UserOptionTemplatePreference, and
Product.showExactStock. Constraints enforce owner consistency, normalized
per-owner names, normalized values per template, non-negative usage, category
mapping uniqueness, preference uniqueness, and bounded non-empty display text.

## Built-in SYSTEM templates

- Color with twelve colors and optional hex presentation metadata
- Clothing Size: XXS through 3XL
- EU Shoe Size: 35–46
- Material
- RAM
- Storage
- Capacity
- Pack Quantity
- Style

Migration inserts are idempotent and never modify User templates or Product
options. The development seed recreates deterministic Apparel and Electronics
recommendation mappings after its intentional development-data cleanup.

## Recommendations and ranking

Visible templates are active SYSTEM templates plus the current User's active
templates. Ranking is pinned, category priority, recent use, frequent use, then
alphabetical. The API de-duplicates templates because each template is returned
once with ranking metadata. Recommendations never activate draft options.

## User-saved preset behavior and APIs

Protected endpoints:

- GET/POST `/api/admin/option-templates`
- PUT/DELETE `/api/admin/option-templates/:id`
- PUT `/api/admin/option-templates/:id/preference`

Service-layer ownership prevents SYSTEM edits and cross-User mutation.
`/admin/settings/product-options` lists presets, creates personal presets,
pins/unpins visible templates, and soft-disables personal presets. Editing a
preset affects future Products only.

## Product creation workflow

The Product form now provides:

1. Basic information, Category, publication, and exact-stock display setting.
2. Simple or Product-with-options selection.
3. Explicit template activation or Custom option creation.
4. Ready-value selection and custom draft values.
5. Deterministic explicit-combination validation without an option-type limit.
6. One canonical SKU draft state shared by matrix and guided allocation views.
7. Offered toggles distinct from enabled zero-stock combinations.
8. Optional physical-unit target with allocated/remaining validation.
9. Per-enabled-SKU bulk stock, enable-all, and disable-all helpers.
10. Collapsed SKU and price-override Advanced settings.
11. Product summary before atomic creation.

Simple Product behavior remains one hidden default SKU.

## Matrix, guided allocation, and Product editing

Quick matrix and guided allocation are alternate presentations over the same
draft map. The optional target is never persisted. The current v1 edit form
preserves Product type and existing SKUs and does not regenerate combinations.
A full option-difference editor with impact preview remains a limitation.

## Storefront dynamic availability

Configurable Products begin without a preselected SKU. Partial selections filter
exact combinations. Values are Available only when a matching active SKU has
stock, Out of stock when only matching active zero-stock SKUs exist, and
Unavailable otherwise. Exact stock is hidden unless Product.showExactStock is
enabled. Add to Cart still requires one active in-stock ProductVariant ID.

## Migration, tests, and verification

The finalized four-migration history applied from scratch to the isolated
`ecommerce_sku_test_20260716` PostgreSQL database.

Tests cover SYSTEM template count, personal ownership, normalized duplicates,
cross-User denial, pin/category ranking, Product-owned copy isolation, usage
tracking, normalization, availability classification, atomic Product/SKU
creation, checkout normalization, and lifecycle regressions.

| Command                                                           | Result          |
| ----------------------------------------------------------------- | --------------- |
| `npx prisma format`                                               | PASS            |
| `npx prisma validate`                                             | PASS            |
| `npx prisma generate`                                             | PASS            |
| `npx prisma migrate deploy` from scratch on disposable PostgreSQL | PASS            |
| `npm run lint`                                                    | PASS            |
| `npm run typecheck`                                               | PASS            |
| `npm run format:check`                                            | PASS            |
| `npm run test` with disposable PostgreSQL                         | PASS — 15 tests |
| `npm run build`                                                   | PASS            |

Browser automation was not run because the repository has no browser test
framework.

## Categories requiring mapping review

Deterministic mappings exist only for obvious slugs:

- clothing/apparel
- electronics/phones/smartphones
- shoes/footwear

Every other Category, including Home & Kitchen and custom Categories, remains
unmapped until explicitly reviewed. No fragile runtime substring matching is
used.

## Remaining limitations

- The settings page provides create, list, pin, and disable; full value
  reordering/category editing and one-click SYSTEM clone UI are API/service
  capable only in part and not fully surfaced.
- The configurable stock view is row-based for all option counts; dedicated
  two-dimensional cells and third-option tabs are not fully visualized.
- Custom draft options are not yet offered a Save as personal preset checkbox.
- Existing Product option diffing, impact preview, new disabled combinations,
  and safe removed-combination handling are not implemented.
- Bulk price override/clear controls are not implemented.
- No browser automation framework executed.

## Deployment steps

1. Back up PostgreSQL.
2. Run `npx prisma migrate deploy`.
3. Review unmapped Categories and add explicit OptionTemplateCategory rows.
4. Verify SYSTEM template/value counts.
5. Deploy the long-running Node container.
6. Smoke-test preset ownership, Product creation, stock allocation, storefront
   partial selection, and checkout.

## Rollback considerations

Templates are independent of Products, so disabling template features does not
alter inventory. Do not drop Product.showExactStock or template tables while the
new application is running. Prefer a forward corrective migration.

## Complete changed-file inventory

- Prisma schema, seed, and option-template migration
- Option-template domain, validators, service, API routes, and settings page
- Product creation service and route usage tracking
- Product configurator and storefront selector
- Product DTO exact-stock setting
- Option-template unit and integration tests
- README and Product-related documentation
- This report
