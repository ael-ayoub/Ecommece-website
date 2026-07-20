# Admin Products Inline Management Redesign

## Executive summary

`/admin/products` is now a dark navy and purple, production-oriented catalog workspace. Product rows are the primary editing entry point, the expanded panel contains Product fields, images, and the existing transactional Variant manager, and the list no longer exposes visible **Edit** or **Manage Variants** links. The implementation adds real server pagination, search, filters, sorting, column preferences, row selection, bounded bulk mutations, and a bounded Simple-Product CSV import.

No Prisma schema, migration, client storefront component, Product stock field, Product type rule, SKU inventory rule, explicit-combination rule, order history, or checkout behavior was changed.

## Approved reference

The specification named:

- `/mnt/data/a_screenshot_like_scene_a_dark_mode_professional.png`
- `/mnt/data/image(2).png`

The approved image was initially unavailable at its stated `/mnt/data` path. It was subsequently supplied as `/home/ael-aiss/Downloads/ChatGPT Image Jul 20, 2026, 01_42_31 PM.png`, inspected at original resolution, and preserved as `docs/screenshots/admin-products-inline-20260720/approved-reference.png`.

The final comparison used only the right-hand application interface. Reference-driven corrections included the single-row desktop toolbar, persistent zero/selected bulk bar, tighter Product rows, five-field general editor, immediate Variant visibility, structured option chips, a functional Add Combination shortcut, and progressive disclosure for description, exact-stock display, and images.

## Design skill used

The installed `ui-ux-pro-max` skill at `.codex/skills/ui-ux-pro-max/SKILL.md` was read and used. Executed workflows included:

- design-system search for `professional dark navy ecommerce admin product table inline editor dense accessible`;
- UX search for `dark admin data table inline editing filters bulk actions dialogs keyboard`;
- focused color and React-performance searches.

Applied principles included semantic dark tokens, compact information hierarchy, card adaptation on mobile, visible focus, text plus color for status, constrained motion, lazy mounting of the expanded editor, bounded data operations, and explicit destructive confirmation.

Generated recommendations for a marketing comparison layout, light blue/green palette, decorative glow, new web fonts, and oversized calls-to-action were rejected because they conflicted with the approved admin composition and existing Product architecture.

## Repository audit

Reviewed the Product/SKU and inventory documentation, explicit-combination and option-template reports, Product-image implementation, Docker architecture, project structure, lifecycle/deletion implementation, admin shell, current Product routes, services, validators, image APIs, Variant batch APIs, authentication guards, and same-origin protection.

The previous Products list fetched up to 100 full Products and displayed visible Edit/Manage Variants links plus browser-native lifecycle prompts. It did not provide real list search controls, server filters/sorting, columns, selection, bulk actions, inline management, import, loading skeletons, responsive cards, or result pagination.

## Final design system

Admin styles are scoped under `.admin-app`. Semantic tokens now implement:

- page `#08111F`;
- sidebar/header navy surfaces;
- layered `#101B2D`, `#152238`, and `#18263B` surfaces;
- blue-gray borders;
- `#F5F7FB` primary text and muted blue-gray supporting text;
- `#6D4AFF` purple primary accent with `#8C75FF` focus;
- semantic success, warning, danger, and info surfaces;
- restrained radii, shadows, 150–220 ms transitions, and reduced-motion overrides.

The storefront `.client-storefront` scope was not modified.

## Product table architecture

The table contains selection, thumbnail/Product identity, Type, Category, effective Price, SKU/derived stock, derived Availability, publication Status, an ellipsis action menu, and a semantic expansion button. Thumbnails use the primary image, then ordered display URL, then a deliberate placeholder with broken-image fallback.

Optional columns are locally persisted. Product identity and actions are always present. Desktop uses the dense table; mobile uses cards rather than compressing the desktop table.

## Query, filters, sorting, and pagination

The Products API now accepts bounded page sizes from 5 to 50 and supports:

- name, description, Category, numeric Product ID, and SKU search;
- Category slug;
- Simple/Configurable type;
- Published/Unpublished state;
- Available/Out of stock/Unavailable state;
- minimum/maximum base price;
- newest, oldest, name, base-price, and status sorting.

State is canonical in the URL. Filter changes reset the page. Pagination shows result range, total, rows per page, previous/next, and current/total page. Admin `all=1` now explicitly rejects callers without an ADMIN session instead of silently returning the public subset.

## Selection and bulk actions

Selection supports individual rows, visible-page selection, indeterminate state, selected count, and clear. The dedicated admin bulk endpoint accepts a de-duplicated maximum of 50 Product IDs and applies existing publish, unpublish, or permanent-delete services. It returns a result for each Product, preserves failed rows as selected, and reports partial failures.

Deletion continues to use the existing terminal-history and active-order eligibility policy. No historical snapshot is changed.

## Row expansion and inline Product editing

Clicking a non-interactive row area or its semantic chevron opens the editor. Interactive descendants are guarded from accidental expansion. The chevron exposes `aria-expanded`, `aria-controls`, an accessible name, focus styling, and reduced-motion behavior. One Product is open at a time; dirty Product fields block silent closing/switching and instruct the admin to save or cancel.

The editor exposes name, description, Category, base price, publication status, exact-stock-display setting, and read-only Product type with the immutable-type helper. Cancel restores server-confirmed values. Save uses the existing Product update endpoint and does not combine or misrepresent Product and Variant transactions.

## Inline images

The existing Product image manager is embedded in the editor. It retains ordered images, primary selection, alt text, upload, deletion, configured local media API, validation, and broken-image presentation. Selected files upload after the Product save succeeds. The storage abstraction and database-first deletion behavior were not replaced.

## Inline Variant management

The existing `VariantManager` mounts only for an expanded Product in the desktop presentation. It retains:

- structured option selections;
- editable label and globally normalized SKU;
- nullable price override/base-price inheritance;
- SKU-owned non-negative stock;
- independent active state;
- dirty-row highlighting and explicit discard;
- transactional batch save;
- explicit Add Combination with one value per Product option;
- duplicate key/SKU validation;
- no Cartesian persistence or theoretical SKU creation.

The dedicated compatibility Variant route remains available, but no visible Manage Variants list action remains.

## Product import

Import is functional and deliberately supports Simple Products only. The dialog provides a CSV template, `.csv` selector, valid/invalid preview, physical row errors, confirmation, pending state, and per-row server result summary.

Bounds are 256 KB in the browser, 25 rows in parser/API validation, and bounded string lengths on the server. Required fields are name, description, positive base price, existing Category name/slug, SKU, non-negative whole stock, and publication state. Every mutation requires database-backed ADMIN authorization and same-origin validation. The server constructs the existing `SIMPLE` create input, so each imported Product receives exactly one hidden default ProductVariant, nullable price override, SKU stock, and no Product-level stock.

Imports return per-row results. They are not all-or-nothing across the entire file; every successfully created Product is internally transactional through the existing creation service. Configurable CSV import is intentionally unsupported because an unambiguous explicit-combination format was outside the safe focused scope.

## Accessibility and responsive behavior

Implemented labelled search/filters, semantic table headings, accessible checkboxes, visible dark focus, status text plus color, `aria-expanded`/`aria-controls`, labelled icon controls, menu roles, modal roles, Escape close, initial dialog focus, live mutation messages, 44 px-class mobile controls, stacked editor fields, card presentation below 768 px, and reduced-motion overrides.

Known accessibility limitation: the custom dialog establishes initial focus and Escape behavior but does not yet implement a complete cyclical focus trap. The action menu uses menu roles and keyboard-operable native controls, but does not add optional arrow-key roving focus.

## API and backend changes

- Extended `listProducts` with bounded admin query controls and deterministic sorting.
- Hardened `all=1` authorization.
- Added `/api/admin/products/bulk`.
- Added `/api/admin/products/import`.
- Added pure bounded CSV parsing and validation helpers.

No Prisma-related file changed.

## Files changed

- `ecommerce/src/app/admin/products/page.tsx`
- `ecommerce/src/components/admin/products/AdminProductInlineEditor.tsx`
- `ecommerce/src/app/api/products/route.ts`
- `ecommerce/src/app/api/admin/products/bulk/route.ts`
- `ecommerce/src/app/api/admin/products/import/route.ts`
- `ecommerce/src/services/product.service.ts`
- `ecommerce/src/domain/product-import.ts`
- `ecommerce/src/app/globals.css`
- `ecommerce/tests/unit/product-import.test.ts`
- `docs/screenshots/admin-products-inline-20260720/*`
- this report

## Tests added

`product-import.test.ts` covers quoted commas, publication normalization, physical row errors, invalid stock, exact header enforcement, and row bounds. Existing Product, explicit-combination, inventory, storefront, image, auth, and checkout tests remain passing.

## Verification commands

| Command | Result | Notes |
|---|---|---|
| `docker compose exec -T app npx prettier --write ...changed files...` | PASS | Changed files formatted. |
| `docker compose exec -T app npm run lint` | PASS | No ESLint warnings/errors. |
| `docker compose exec -T app npm run typecheck` | PASS | TypeScript emitted no errors. |
| `docker compose exec -T app npm run test:unit` | PASS | 36/36 passed, including 3 new import tests. |
| `docker compose exec -T app npm run test:integration` | PASS with SKIPS | 5/5 intentionally skipped because no disposable `TEST_DATABASE_URL` was configured; no destructive test was run against development. |
| `docker compose stop app && docker compose run --rm app npm run build && docker compose start app` | PASS | Production build compiled and generated all routes; app restarted healthy. |
| `docker compose config --quiet` | PASS | Compose configuration valid. |
| `docker compose ps` | PASS | database and ecommerce healthy. |
| `git diff --check` | PASS | No whitespace errors. |
| local CDP browser audit | PASS | Admin login 200, mobile overflow false, storefront admin scope false/client scope true. |

Build-time server logs reported generic API request failures while statically generating pages without request/session context, but the build completed successfully and the running health checks passed.

## Manual and visual validation

Performed without mutating catalog data:

- authenticated `/admin/products` load;
- normal desktop table at 1440×900;
- expanded Product editor and embedded Product fields/images/Variants;
- URL-filtered and sorted table;
- visible selection/bulk toolbar;
- ellipsis action menu;
- Import dialog;
- mobile Product cards at 390×844 with no page overflow;
- storefront `/products` load with `.client-storefront` present, `.admin-app` absent, and no overflow.

Mutation confirmation dialogs were opened but publish, unpublish, delete, import, Product save, image mutation, and Variant save were not submitted during visual validation to avoid changing development data.

## Screenshot paths

- `docs/screenshots/admin-products-inline-20260720/admin-products-1440x900.png`
- `docs/screenshots/admin-products-inline-20260720/admin-products-expanded-1440x900.png`
- `docs/screenshots/admin-products-inline-20260720/admin-products-filtered-selected-1920x1080.png`
- `docs/screenshots/admin-products-inline-20260720/admin-products-menu-1920x1080.png`
- `docs/screenshots/admin-products-inline-20260720/admin-products-import-1920x1080.png`
- `docs/screenshots/admin-products-inline-20260720/admin-products-mobile-390x844.png`
- `docs/screenshots/admin-products-inline-20260720/approved-reference.png`

## Storefront regression result

No storefront file was changed. Browser inspection confirmed the storefront has its client scope and not the admin scope. Existing storefront/Product behavior unit tests pass.

## Known limitations and recommendations

1. Run the integration suite against a disposable `TEST_DATABASE_URL`, then add route-level security/import/bulk assertions against that database.
2. Add a complete focus trap and optional arrow-key roving focus to custom dialogs/menus.
3. If atomic whole-file import is required later, extract Product creation to a transaction-client helper and commit all valid rows in one transaction. Current per-Product creation remains safe and transactional, with explicit partial results.
4. The compact CSV parser supports RFC-style quoted commas and escaped quotes but not quoted multi-line cells. The UI explains a bounded Simple-Product template; a future full CSV library could broaden syntax after dependency review.

These recommendations are future hardening, not hidden claims of completed validation.
