# Admin Products CSS Layout Fix

## Summary

Corrected the `/admin/products` table and expanded-editor layout without changing Product, Variant, filtering, pagination, API, database, or storefront behavior.

## CSS/layout corrections

- Added one semantic `<colgroup>` shared by the header and every Product row. Named columns now provide predictable widths for checkbox, Type, Category, Price, SKU/Stock, Availability, Status, Actions, and Chevron, while Product consumes the remaining space.
- Replaced fragile positional `nth-child` sizing and removed the forced `68rem` table minimum.
- Corrected the expanded editor from a hard-coded `colSpan={11}` to the exact number of currently rendered columns.
- Made the table, wrapper, editor cell, and editor explicitly `width/max-width: 100%`, `min-width: 0`, and `box-sizing: border-box`.
- Kept desktop overflow visible so row action menus and expanded content are not clipped.
- Aligned row height, vertical centering, cell padding, icon buttons, checkboxes, thumbnails, Product identity text, Status, Actions, and Chevron columns.
- Allowed Product identity content to shrink correctly with clean ellipsis while retaining the Product ID on the second line.
- Applied the expanded purple surface and borders to every cell so the selected row is continuous; connected the editor row border and lower rounded corners.
- Matched the bulk toolbar and table to the same full-width boundary.
- Switched to the existing Product-card layout below `1200px`, preventing desktop-column squeezing at 1024px, 768px, and 390px. Cards and expanded editors use `min-width: 0` and remain within the page.
- Preserved the existing dark navy/purple tokens and page design.

## Screenshot availability

The requested files were not present at:

- `/mnt/data/image(5).png`
- `/mnt/data/image(6).png`
- `/mnt/data/image(7).png`

Therefore, literal screenshot comparison was not possible. The reported defects were verified against the current table markup and CSS.

## Files changed

- `ecommerce/src/app/admin/products/page.tsx` — layout-only column definitions, Product-cell class, and accurate editor column span.
- `ecommerce/src/app/globals.css` — synchronized widths, alignment, overflow, selected-row/editor boundaries, truncation, and responsive card breakpoint.

## Verification

- `docker compose exec app npx prettier --check src/app/admin/products/page.tsx src/app/globals.css` — PASS.
- `docker compose exec app npm run lint` — PASS, no warnings or errors.
- `docker compose exec app npm run typecheck` — PASS.
- `docker compose exec app npm run build` — PASS on the final retry; all 35 static pages generated. The first attempt compiled successfully but encountered a transient shared `.next` route-collection failure for `/register`. Existing `jose` Edge-runtime warnings remain non-fatal.
- `git diff --check` — PASS.

No storefront, API, database, Product, or Variant functionality was modified.
