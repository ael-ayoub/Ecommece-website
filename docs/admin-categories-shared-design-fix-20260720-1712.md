# Admin Categories Shared Design Fix

## Summary

Updated `/admin/categories` to use a reusable shared admin UI layer consistent with the existing dark navy and purple design. Category creation, editing, Product counts, deletion protection, validation, query invalidation, and existing APIs remain intact.

The supplied current-state screenshot `/mnt/data/image(8).png` was not present, so it could not be inspected directly.

## Shared design-system work

Added reusable primitives in `ecommerce/src/components/admin/AdminUI.tsx`:

- `AdminPageHeader`
- `AdminCard`
- `AdminTable`
- `AdminInput`
- `AdminButton`
- `AdminActionMenu`
- `AdminConfirmDialog`
- `AdminEmptyState`
- `AdminLoadingState`
- `AdminAlert`

All new styles are central, semantic `.admin-*` rules scoped by the existing `.admin-app` design environment. No `categories-page-*` selectors or duplicated page-specific button, input, table, modal, or menu styles were added.

## Categories result

- Uses the standard full-width admin heading, cards, typography, borders, spacing, table header, rows, and responsive behavior.
- Category names, Product-count badges, and row actions are aligned consistently.
- Raw underlined actions were replaced by a shared fixed-position action menu that escapes table overflow.
- Delete uses the shared danger treatment and is visibly disabled while a Category contains Products.
- Native `confirm()` was replaced with a keyboard-dismissible shared accessible confirmation dialog.
- Inline editing has labelled input, Save/Cancel actions, Escape/Enter keyboard support, pending state, and validation.
- Create Category uses shared labelled input and button components, with loading/disabled behavior and a stacked mobile layout.
- Loading skeleton, empty state, recoverable query error, mutation error, editing, and disabled states are explicit.
- No storefront files or styles were changed.

## Files changed

- `ecommerce/src/app/admin/categories/page.tsx`
- `ecommerce/src/components/admin/AdminUI.tsx`
- `ecommerce/src/app/globals.css`

## Verification

- Focused Prettier write/check — PASS.
- `docker compose exec app npm run lint` — PASS, no warnings or errors.
- `docker compose exec app npm run typecheck` — PASS.
- `docker compose exec app npm run test:unit` — PASS, 41/41 tests.
- `docker compose exec app npm run test:integration` — completed with all five database-dependent tests skipped by the repository opt-in guard; no development data was changed.
- `docker compose exec app npm run build` — PASS; `/admin/categories` and all other admin/client routes built successfully. Existing build-time API log messages were non-fatal.
- `git diff --check` — PASS.
