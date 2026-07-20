# Admin Dropdown Design and Dismissal Fix

## Summary

All native HTML selects in the admin application were replaced with one reusable, accessible `AdminSelect` combobox/listbox. The opened list is now a dark navy, purple-accented, portalled admin surface rather than an operating-system popup. Product filters, additional filters, pagination, Product editing/creation, explicit Variant combinations, Variant status, Orders filtering, and inline Order status now share the same behavior.

Product query state, server pagination, Product/SKU rules, admin authorization, and storefront controls were not changed.

## Root cause

The previous controls used native `<select>` elements. Browsers and operating systems own most of the opened option-popup rendering, so styling `<option>` could not reliably reproduce the approved dark interface. Native controls also did not coordinate with Columns/actions popovers and could not provide the requested custom portal positioning.

The named screenshot `/mnt/data/image(3).png` was not present in `/mnt/data`. The failure was reproduced from the existing native controls and the precise screenshot description in the task.

## Installed design skill used

The `ui-ux-pro-max` skill at `.codex/skills/ui-ux-pro-max/SKILL.md` was read and applied. Executed searches:

- `dark ecommerce admin accessible custom select listbox compact professional --design-system --variance 2 --motion 2 --density 9`
- UX search for `listbox keyboard outside click focus portal viewport positioning`

Applied guidance included visible focus, full keyboard access, 44px triggers, compact options, token-driven dark surfaces, bounded viewport placement, no page overflow, semantic disabled states, and reduced motion.

## Native controls replaced

- Products Category, Product type, and publication filters.
- Availability and sorting inside additional Filters.
- Products rows-per-page selector.
- Inline Product Category and publication selectors.
- Product create/edit Category selector.
- Product create/edit explicit option-value selectors.
- Inline Variant explicit option-value selectors.
- Inline Variant Active/Disabled selector.
- Orders status filter.
- Inline Order lifecycle status selector.

An audit using `rg` confirmed no `<select>` remains under `src/app/admin` or `src/components/admin`.

## Reusable component architecture

`AdminSelect` is a controlled client component accepting:

- accessible/visible label;
- selected value and change callback;
- placeholder;
- options with optional description, icon, and disabled state;
- disabled, loading, and error states;
- custom trigger class and menu width.

Pure enabled-option navigation functions live in `src/domain/admin-select.ts` and are unit tested independently.

Only the active dropdown mounts a menu. The menu is portalled to `document.body`, avoiding clipping by toolbar, table, editor, and scrolling containers.

## Outside-click and single-open strategy

While open, one capture-phase `pointerdown` listener checks both the trigger ref and portalled menu ref. A pointer outside both closes the list; a pointer inside does not pre-empt option selection. The listener is installed only while open and is always removed during close/unmount.

A window-scoped `admin-select-open` event carries the opening component ID. Every other open `AdminSelect` closes when it receives a different ID. Filters, Columns, and row Actions announce through the same event and use one page-level outside-pointer listener.

The dropdown also closes after selection, trigger toggle, Escape, Tab, route/query changes, parent unmount, editor collapse, and opening a competing control.

## Portal, tokens, and positioning

The portal receives `.admin-portal-theme`, an explicit mapping of the established admin semantic tokens. It therefore does not depend on storefront or body inheritance.

The menu:

- uses fixed positioning at z-index 80, below critical modals;
- matches the trigger width with a 160px sensible minimum;
- clamps its left/right edges to an 8px viewport margin;
- opens below when possible and above when bottom space is insufficient;
- recalculates on resize and capturing scroll events;
- has a bounded 120–320px height and dark narrow scrollbar.

Browser measurements showed the mobile menu at `left: 29`, `right: 361` in a 390px viewport with no document overflow. The bottom pagination menu opened upward.

## Keyboard and accessibility behavior

The trigger uses `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`, accessible name, disabled state, and invalid state. The menu uses `role="listbox"` and its options use `role="option"`, `aria-selected`, and `aria-disabled`.

Supported keys:

- Enter/Space: open or select.
- Arrow Down/Up: open and navigate enabled options.
- Home/End: first/last enabled option.
- Escape: close without changing and restore trigger focus.
- Tab: close and continue natural focus navigation.

Disabled options are skipped. The active option scrolls into view. Hover/keyboard highlight, selected purple surface, and check icon are visually distinct.

## Responsive and interaction regression

The portal is not clipped by the Product table or expanded editor. Selecting an inline Product or Variant value does not toggle/collapse the Product row because the trigger is a real button and existing row interaction guards recognize it.

The Products workflow contains zero native selects. Client storefront files and selectors were not migrated or styled.

## Files changed for this correction

- `ecommerce/src/components/admin/AdminSelect.tsx`
- `ecommerce/src/domain/admin-select.ts`
- `ecommerce/src/app/globals.css`
- `ecommerce/src/app/admin/products/page.tsx`
- `ecommerce/src/components/admin/products/AdminProductInlineEditor.tsx`
- `ecommerce/src/components/admin/products/ProductForm.tsx`
- `ecommerce/src/components/admin/products/VariantManager.tsx`
- `ecommerce/src/app/admin/orders/page.tsx`
- `ecommerce/src/components/admin/orders/OrderStatusSelect.tsx`
- `ecommerce/tests/unit/admin-select.test.ts`
- this report and its screenshots

## Tests added

`tests/unit/admin-select.test.ts` verifies first/last enabled navigation, forward/backward disabled-option skipping, wrapping, and the all-disabled result.

The local browser audit verified:

- styled menu opens;
- Products native-select count is zero;
- selected Published value updates the URL and trigger;
- outside pointer closes;
- Escape closes;
- opening Product Type closes Status;
- inline Category opens while the editor remains mounted;
- page-size menu opens upward;
- mobile menu stays inside the viewport;
- storefront has client scope and no admin scope.

## Verification commands and results

| Command | Result |
|---|---|
| `docker compose exec -T app npx prettier --write ...changed files...` | PASS |
| `docker compose exec -T app npm run lint` | PASS, no warnings |
| `docker compose exec -T app npm run typecheck` | PASS |
| `docker compose exec -T app npm run test:unit` | PASS, 39/39 |
| `docker compose exec -T app npm run test:integration` | PASS command; 5/5 skipped because disposable `TEST_DATABASE_URL` was not set |
| `docker compose stop app && docker compose run --rm app npm run build && docker compose start app` | PASS |
| `docker compose config --quiet` | PASS |
| `docker compose ps` | PASS; database and ecommerce healthy |
| `git diff --check` | PASS |
| `node /tmp/admin-dropdown-audit2.mjs` | PASS; all recorded interaction assertions true |

The production build emitted the repository's existing generic API logs while collecting static page data without request/session context, but compilation, type validation, route generation, restart, and health checks passed.

## Screenshot paths

- `docs/screenshots/admin-dropdown-fix-20260720/admin-dropdown-status-closed.png`
- `docs/screenshots/admin-dropdown-fix-20260720/admin-dropdown-status-open.png`
- `docs/screenshots/admin-dropdown-fix-20260720/admin-dropdown-keyboard-highlight.png`
- `docs/screenshots/admin-dropdown-fix-20260720/admin-dropdown-category-open.png`
- `docs/screenshots/admin-dropdown-fix-20260720/admin-dropdown-inline-editor.png`
- `docs/screenshots/admin-dropdown-fix-20260720/admin-dropdown-opens-upward.png`
- `docs/screenshots/admin-dropdown-fix-20260720/admin-dropdown-mobile.png`

## Products and storefront results

Products search/filter URL behavior, pagination, row expansion, Product save, Variant dirty/batch behavior, and explicit combination logic are unchanged. Browser validation confirmed the expanded editor stays open during select interaction.

The storefront loaded with `.client-storefront`, without `.admin-app`. No client component or storefront select was modified.

## Remaining limitations

- The repository does not include a DOM component-test environment such as jsdom/Testing Library. Pure navigation logic has unit coverage and full dismissal/portal behavior was validated through the existing local CDP browser harness.
- Database integration suites were not executed against a disposable database because `TEST_DATABASE_URL` was unavailable; the configured command safely skipped rather than touching development data.
- The task screenshot file itself remained unavailable, so comparison used the task's exact defect description and the approved dark Products design already present in the repository.
