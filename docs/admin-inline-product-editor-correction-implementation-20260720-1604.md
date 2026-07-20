# Admin Inline Product Editor Correction — Implementation Report

## Summary

The expanded editor on `/admin/products` now presents Product information, images, and SKU inventory as three clear, accessible sections while preserving the existing Product/SKU architecture and API operations. Simple, structured Configurable, and legacy Configurable Products receive distinct inventory presentations. Product drafts and Inventory/Variant drafts have separate counts, discard actions, save actions, success/error feedback, and dirty-state lifecycles.

No Prisma schema, storefront component, Product/SKU business rule, authorization rule, or API validation was changed by this focused correction.

## Screenshot and design references

- The requested current-state file `/mnt/data/image(4).png` was not present in the workspace and therefore could not be inspected.
- The approved reference was inspected at `docs/screenshots/admin-products-inline-20260720/approved-reference.png`.
- New runtime screenshots were not captured: the repository does not include a browser-test runner, and the required authenticated multi-viewport workflow was not available through the current tool surface. Visual claims below are based on source inspection, responsive CSS verification, and the successful production build.

## Installed design skill used

The installed `ui-ux-pro-max` skill was read and used. Its searchable design data was queried for a dark ecommerce admin inline editor and for tabs, progressive disclosure, independent dirty forms, responsive tables/cards, and save-boundary patterns. It influenced:

- restrained dark-surface hierarchy and purple accent use;
- compact tabs with visible text dirty markers;
- separate Product and SKU action areas;
- responsive desktop grids and mobile cards;
- deliberate read-only Product-type treatment;
- accessible switch, listbox, and dialog semantics.

## Root causes corrected

- The previous inventory UI treated all Product types as Configurable, causing Simple Products to receive combination creation and legacy language.
- Product and Variant changes were presented too closely despite using separate endpoints and transactions.
- A constrained Variant container and unbalanced field grid created unused width.
- Product type looked like an editable field despite being immutable.
- Description, exact-stock display, and image management lacked strong navigation.
- native select/checkbox/number affordances conflicted with the admin system.
- Closing or switching an editor merely blocked the action; it did not provide an accessible discard confirmation.

## Product-type-specific behavior

Presentation is selected centrally by `inventoryPresentation(productType, optionCount)`:

- `SIMPLE` → `SIMPLE_INVENTORY`
- `CONFIGURABLE` with stored options → `STRUCTURED_VARIANTS`
- `CONFIGURABLE` without stored options → `LEGACY_VARIANTS`

This selection changes presentation only. It does not alter Product type, persisted data, API payload rules, or Product/Variant architecture.

## Simple Product design

Simple Products show one **Inventory SKU** section containing only the existing first/default SKU:

- SKU;
- optional price override;
- inherited/effective price explanation;
- stock;
- Enabled/Disabled state;
- Reset to base price only when an override exists;
- independent Inventory dirty count, discard, and save controls.

They never render option chips, option selectors, legacy Configurable messaging, `Add Combination`, or a second-SKU creation control. A malformed Simple Product with no SKU receives an explicit error rather than a creation path that could violate the one-SKU rule.

## Configurable Product design

Structured Configurable Products show **Options & Variants**, explicit SKU/active-unit summaries, a full-width editable Variant table, independent Variant batch actions, and the existing explicit Add Combination workflow.

The table uses the requested column order and proportional desktop widths:

- Option combination 28%;
- SKU 20%;
- Price override 18%;
- Stock 12%;
- Status 12%;
- Actions 10%.

No Cartesian combinations are generated. New combinations still use the existing endpoint and start Disabled.

## Legacy Configurable Product behavior

Configurable Products without structured options show their existing editable SKU rows and a concise legacy notice explaining that structured combinations cannot be added until a supported option workflow exists. The unusable option selectors and Add Combination form are omitted.

## Section architecture

The editor uses semantic `tablist`, `tab`, and `tabpanel` roles:

- General
- Images (with visible item count)
- Inventory SKU for Simple Products, or Variants for Configurable Products

Panels remain mounted while switching tabs, preserving drafts. General uses a balanced responsive grid, a full-width Description, and a labelled exact-stock switch. Images uses the existing Product image manager and storage/API behavior.

## Save-boundary architecture

Product fields continue to use `PUT /api/products/:id`. Variant row batches continue to use `PUT /api/products/:id/variants/batch`; explicit combinations continue to use `POST /api/products/:id/variants`.

The UI exposes the real boundary:

- **Discard Product Changes / Save Product Changes**
- **Discard Inventory Changes / Save Inventory Changes** for Simple
- **Discard Variant Changes / Save Variant Changes** for Configurable

Each baseline resets only after its corresponding successful operation. Section errors preserve drafts. Discarding one domain does not reset the other. Combined dirty state protects the expanded row. Closing it or opening another Product now opens an accessible confirmation with **Keep editing** and **Discard unsaved changes**.

Image reorder/primary/delete behavior remains the existing immediate media workflow. Newly selected uploads are included in Product dirty state and uploaded after the Product update.

## Custom controls

- Existing `AdminSelect` is used for Category, publication, and SKU status.
- New `AdminSwitch` provides a keyboard-operable `role="switch"` for exact-stock display.
- Admin number inputs retain keyboard entry, `min`, `step`, and `inputMode` semantics while browser spinner buttons are suppressed inside `.admin-app`.
- Product type is a non-focusable badge, lock icon, and “Locked after creation” helper—not an input.

## Width, border, and hierarchy corrections

- General information fills a four-track desktop grid and collapses to two and then one column.
- Inventory and Variant content uses the full editor width.
- Desktop Variant columns are fixed proportionally; mobile rows transform into labelled stacked cards without horizontal page overflow.
- Combination option selectors use auto-fit tracks and become one column on mobile.
- The editor uses the standard subtle admin border/surface/shadow with a restrained 2px accent instead of a permanent bright ring.
- Section headings, SKU counts, active-unit summaries, action areas, and dirty markers are explicit text, not color alone.

## Files changed by this correction

- `ecommerce/src/app/admin/products/page.tsx`
  - accessible discard confirmation when closing/switching dirty editors.
- `ecommerce/src/app/globals.css`
  - editor tabs, layout, read-only type, switch, save areas, Simple inventory card, proportional Variant table, responsive Variant cards, restrained borders, and admin-scoped number-spinner suppression.
- `ecommerce/src/components/admin/AdminSwitch.tsx`
  - reusable accessible admin switch.
- `ecommerce/src/components/admin/products/AdminProductInlineEditor.tsx`
  - section architecture, balanced General fields, Images discovery, immutable type display, and independent Product draft boundary.
- `ecommerce/src/components/admin/products/VariantManager.tsx`
  - Simple/structured/legacy presentations, separate inventory draft boundary, price inheritance detail, full Variant table, and conditional Add Combination.
- `ecommerce/src/domain/admin-product-editor.ts`
  - deterministic presentation selection.
- `ecommerce/tests/unit/admin-product-editor.test.ts`
  - Product-type presentation regression coverage.

The working tree contains other pre-existing Product-management and dropdown redesign changes; they were preserved and not reverted.

## Tests added

Two focused assertions cover:

- Simple Products always select the single Inventory SKU presentation regardless of option-count anomalies.
- Configurable Products select structured or legacy presentation based on stored options.

Existing AdminSelect keyboard/outside-dismiss tests and Product/SKU domain tests also ran in the complete unit suite.

## Verification commands and results

| Command | Result | Notes |
|---|---|---|
| `docker compose exec app npx prettier --check src/app/admin/products/page.tsx src/components/admin/AdminSwitch.tsx src/components/admin/products/AdminProductInlineEditor.tsx src/components/admin/products/VariantManager.tsx src/domain/admin-product-editor.ts tests/unit/admin-product-editor.test.ts src/app/globals.css` | PASS | All focused files use repository formatting. |
| `docker compose exec app npm run lint` | PASS | No ESLint warnings or errors. |
| `docker compose exec app npm run typecheck` | PASS | Sequential final run completed without errors. An earlier concurrent run raced with `next build` while `.next/types` was being regenerated and was not treated as the final result. |
| `docker compose exec app npm run test:unit` | PASS | 41 passed, 0 failed. |
| `docker compose exec app npm run test:integration` | PASS with skips | 5 integration files discovered; all 5 skipped because their opt-in test database/runtime flag was not enabled. No destructive database test was run against development data. |
| `docker compose exec app npm run build` | PASS | Sequential production build compiled, type-checked, generated 35 static pages, and emitted all expected admin/client routes. The first concurrent attempt failed route collection while generated artifacts were being accessed; the required isolated sequential retry passed. Existing `jose` Edge-runtime warnings and build-time logged API request failures did not fail the build. |
| `git diff --check` | PASS | No whitespace errors. |

No Docker configuration or Prisma/schema file changed, so Compose configuration and Prisma validation were not required for this correction.

## Responsive validation

Source-level responsive validation covered the requested ranges:

- wide/laptop desktop: balanced General grid and proportional full-width Variant table;
- tablet: General, Simple inventory, and combination fields reduce to two columns;
- 320/375/430 mobile rules: one-column fields, horizontally scrollable accessible section tabs, full-width actions, stacked Simple card, stacked labelled Configurable Variant cards, and one-column combination selectors.

Authenticated browser screenshots and live viewport interaction checks were not performed; see remaining limitations.

## Accessibility validation

Implemented and source-audited:

- semantic tab relationships with `aria-selected`, `aria-controls`, and labelled panels;
- semantic switch with `aria-checked`;
- labelled inputs and contextual Variant `aria-label` values;
- read-only Product type expressed as static content;
- dirty state represented in text;
- `role="status"` / `role="alert"` section feedback;
- modal dialog with heading, description, Escape/backdrop dismissal, and initial close focus;
- semantic buttons throughout;
- reduced-motion styles;
- visible existing admin focus treatment;
- mobile table labels supplied through `data-label`.

A live keyboard/screen-reader session was not performed.

## Storefront regression result

No file under client storefront pages/components was changed by this correction. All added visual rules are scoped to admin classes or `.admin-app`. The complete 41-test unit suite—including storefront Product presentation, cart availability, pricing, authentication, checkout, and order rules—passed. The production build emitted the storefront routes successfully.

## Remaining limitations

- The requested current screenshot `/mnt/data/image(4).png` was missing.
- No authenticated browser automation runner exists in the repository, so the requested runtime screenshot matrix, live keyboard audit, and mutation-based manual scenarios were not executed.
- Integration tests were discovered but skipped because the disposable test-database opt-in was unavailable; development data was deliberately not used for destructive SKU/order tests.
- The source-level implementation covers the required validation and save paths, but duplicate combination/SKU rejection and transactional rollback were not re-exercised through the browser in this task.
