# Explicit Product Combination Configurator Implementation — 2026-07-16 21:06

## Executive summary

Replaced automatic Cartesian SKU drafting with an explicit-combination workflow.
Sellers define Product options and values, then add only the exact combinations
they sell. Each added row is one ProductVariant with immutable option identity,
editable display label, SKU stock, and optional price override.

## Previous configurable Product problems

The previous template configurator immediately produced every Cartesian draft
combination, required sellers to disable unwanted rows, and emphasized allocation
across theoretical combinations. Manage Variants saved individual fields on
blur and used a legacy free-text add form.

## Final explicit-combination workflow

1. Enter shared Product information and base price.
2. Choose Simple Product or Product with options.
3. Explicitly activate templates/custom options and select valid values.
4. Selecting values creates no ProductVariant.
5. Choose one value from every option in Add combination.
6. Review/edit automatic label, SKU suggestion, stock, and price.
7. Add exactly one draft SKU.
8. Edit or remove unsaved rows and review derived summary.
9. Atomically save Product, Product options/values, explicit Variants, and links.

Cartesian SKU generation was removed because a theoretical combination is not
proof that the seller offers it. Missing combinations now have no database row.

## Stock and derived totals

Stock remains exclusively on ProductVariant. Product has no total-stock input or
authoritative stock column. The creation summary and Manage Variants calculate
active total stock by summing explicit active SKU quantities. Zero stock is
valid and distinct from a missing combination.

## Price behavior

Product.basePrice is required. New combination price visually begins at the base
price. Leaving it unchanged stores ProductVariant.price as null. A changed price
is stored as an override. Reset to base clears the override. Base-price changes
therefore flow to non-overridden SKUs without overwriting custom prices.

## Editable labels

The Add combination form generates labels from ordered option values. Sellers
may edit them before or after adding. Product service stores the custom label but
uses optionCombinationKey for uniqueness, so label edits do not change option
identity, SKU, Variant ID, inventory, or historical order snapshots.

## Option-template integration

SYSTEM and personal templates remain copy-on-create starting points. Activating
and selecting template values defines Product-owned options only. Template edits
never mutate existing Products or SKUs.

## Admin Product creation

The Product form contains one dynamic selector per active option plus display
label, stock, price, and collapsed SKU fields. Each click adds one row. Duplicate
combination keys and draft SKU codes are rejected. An active configurable
Product requires at least one explicit row.

## Manage Variants and batch save

Manage Variants loads one local draft table, highlights dirty rows, counts
changes, supports Discard, warns on browser unload, and submits every changed row
to one transactional batch endpoint:

`PUT /api/products/:productId/variants/batch`

An invalid SKU conflict rolls back the whole batch and preserves client drafts.
Rows edit display label, SKU, stock, nullable price override, and enabled state.
Disable is the normal persisted-SKU removal behavior.

The same page adds structured explicit combinations. It validates one selected
value from every Product option, rejects duplicate combination/SKU constraints,
and creates new rows disabled by default. Legacy Products without structured
associations remain in clearly marked legacy mode.

## Storefront behavior

The storefront queries only existing ProductVariant associations. Partial
selections classify a value as Available when a matching active SKU has stock,
Out of stock when matching active SKUs exist only at zero stock, and Unavailable
when no matching offered combination exists. Add to Cart requires an exact
active in-stock ProductVariant. Exact quantities remain hidden unless the
Product display setting enables them.

Before exact selection, Product listing/detail price ranges derive from active
SKU effective prices. Exact selection shows the selected override or base price.
Checkout remains server-authoritative.

## API and validation changes

Product creation accepts both the existing internal names and explicit DTO
aliases:

- `selection` or `optionValues`
- `label` or `variantLabel`
- `priceOverride` or `price`

Each Variant must select one valid value from every option. Only submitted rows
are created. Batch Variant validation is bounded and transactional. Unsafe
Product/Variant mutations now consistently run same-origin checks.

## Database and existing-data compatibility

No new migration was required: the existing schema already has nullable Variant
price, editable variantLabel, globally unique SKU, unique
Product/optionCombinationKey, structured option links, and non-negative stock
constraints. Existing Variants, IDs, stock, options, order links, and snapshots
are unchanged.

## Tests added and verification

Tests now confirm:

- Explicit DTO aliases normalize correctly.
- Configurable Products reject zero explicit Variants.
- A 2×2 option vocabulary creates only the two submitted SKUs.
- Missing Cartesian combinations are not inserted.
- Custom labels persist independently of combination keys.
- Base-price changes affect only non-overridden effective prices.
- Batch stock/label/price edits update derived totals.
- A conflicting batch rolls back completely.
- Existing template, storefront availability, checkout normalization, inventory,
  and lifecycle tests continue to pass.

Final command results are recorded after verification.

| Command                                              | Result                      |
| ---------------------------------------------------- | --------------------------- |
| `npx prisma format`                                  | PASS                        |
| `npx prisma validate`                                | PASS                        |
| `npx prisma generate`                                | PASS                        |
| `npx prisma migrate deploy` on disposable PostgreSQL | PASS — no pending migration |
| `npm run lint`                                       | PASS                        |
| `npm run typecheck`                                  | PASS                        |
| `npm run format:check`                               | PASS                        |
| `npm run test` with disposable PostgreSQL            | PASS — 17 tests             |
| `npm run build`                                      | PASS                        |

No browser automation or final-unit checkout concurrency command was available
in the repository.

## Remaining limitations

- Manage Variants warns through browser `beforeunload`; internal Next.js link
  interception is not implemented.
- Permanent deletion eligibility and ordered-SKU 409 behavior are not exposed;
  normal removal remains disable-only.
- Newly added combinations are created in their own atomic request rather than
  being included in the existing-row batch update.
- Browser automation and checkout final-unit concurrency tests are not present
  in the repository.
- Custom option Save as personal preset remains outside the Product form.

## Deployment steps

1. Back up PostgreSQL.
2. Run the existing pending migrations with `npx prisma migrate deploy`.
3. Deploy the long-running Node container.
4. Smoke-test explicit Product creation with a deliberately missing theoretical
   combination.
5. Test batch rollback using a duplicate SKU.
6. Verify missing, zero-stock, disabled, and in-stock combinations on storefront
   and checkout.

## Rollback considerations

There is no schema migration to roll back. Reverting application code leaves all
existing ProductVariant rows compatible, but the older Cartesian UI may again
encourage unwanted draft rows. Preserve Variant IDs, option links, and order
history.

## Complete changed-file inventory

- Product and Variant validators/services/routes
- Explicit Product creation form
- Manage Variants batch editor and batch API
- Explicit-combination unit/integration tests
- README and Product/configurator documentation
- This implementation report
