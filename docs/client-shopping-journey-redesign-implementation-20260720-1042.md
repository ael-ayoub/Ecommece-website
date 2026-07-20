# Client Shopping Journey Redesign Implementation

Date: 2026-07-20 10:42 (Africa/Nouakchott)

## Summary

Task 2 redesigns the client Product-detail, cart, checkout, and order-confirmation journey using the exact scoped visual system established in Task 1. It preserves Simple/Configurable Product behavior, explicit SKU combinations, cart state, server-authoritative pricing and stock, guest checkout, authenticated checkout, Cash on Delivery, checkout locking, and idempotent order creation.

No database, Prisma schema, API contract, backend service, admin route, or admin component changed.

## Installed design skill used

The complete installed `ui-ux-pro-max` skill was read from:

```text
.codex/skills/ui-ux-pro-max/SKILL.md
```

Its mandatory design-system search was run for a premium Product-detail/cart/checkout journey with variance 4, motion 2, and density 5. Detailed UX searches covered option selection, validation, error recovery, pending actions, duplicate submission, accessibility, loading, and z-index.

Applied principles:

- purchase information before decoration;
- minimum 44px touch targets;
- visible labels and inline announced errors;
- explicit selected/unavailable states using text and semantics, not color alone;
- server-confirmed success only;
- disabled pending actions and clear progress;
- stable image aspect ratios and meaningful alt text;
- mobile-first stacking with contained desktop sticky summaries;
- 150–220ms Task 1 interaction rhythm and reduced-motion support;
- recovery-oriented messages that preserve entered values.

The skill suggested an interactive 3D configurator, stronger gradients, and bottom-sheet patterns. Those were rejected because the project explicitly prohibits real 3D and Task 1 already defines a restrained warm-neutral commerce system. No new theme, icon family, animation library, or dependency was introduced.

## Task 1 components and design reused

- `.client-storefront` and every `--client-*` semantic token;
- `client-button-primary`, `client-button-secondary`, `client-text-link`, `client-icon-button`, `client-eyebrow`;
- client main width/gutter behavior;
- `StorefrontState` for empty and not-found states;
- Header, Footer, cart badge, focus rings, typography, radii, shadows, and reduced-motion rules;
- `ProductImage` broken-image behavior;
- `formatCurrency`, `useAuth`, `useCart`, and existing Product/Order DTOs.

Task 1 baseline was verified before editing: lint PASS, typecheck PASS, 24/24 unit tests PASS.

## Product-detail architecture

The server page remains responsible for fetching the published Product through `getProductById`, distinguishing not-found from temporary failure, preserving primary/ordered Product images, and passing the real Variant records into client interaction components.

Presentation is separated into:

- `ProductGallery` — active image and thumbnails;
- `VariantSelector` — explicit option/SKU resolution, effective price, stock, quantity, and cart action;
- server-rendered breadcrumbs, Product identity, supported purchase notes, and description;
- route-specific loading and not-found states.

The desktop layout is a two-column gallery/purchase composition with a contained sticky purchase panel. Mobile renders gallery first, then title and purchase controls without a fixed control obscuring content.

## Gallery behavior

- canonical primary/ordered images from `imageRecords`, with legacy URLs retained as the existing fallback;
- stable 4:5 primary frame and square thumbnail frames;
- active thumbnail uses `aria-pressed`;
- every thumbnail is a keyboard-operable button with an explicit accessible name;
- meaningful active-image alt text;
- decorative thumbnail images use empty alt text;
- missing gallery and broken individual images show deliberate placeholders;
- no autoplay, swipe-only control, zoom dependency, modal, or 3D feature.

## Variant-selection behavior

- Simple Products preselect only their existing active, in-stock SKU.
- Configurable Products do not preselect or guess a SKU.
- Structured option definitions are ordered by stored Product-option position.
- `optionValueAvailability` continues to classify offered, out-of-stock, and nonexistent explicit combinations.
- Add to Cart is absent until exactly one valid active/in-stock SKU resolves.
- Selected Variant label, SKU, effective price override/base-price fallback, and configured stock visibility are displayed.
- Unavailable values are disabled, labelled for assistive technology, and visibly struck through.
- Option controls use semantic `fieldset`/`legend`, `aria-pressed`, and keyboard-native buttons.
- No Cartesian combinations are generated.

## Quantity and add-to-cart behavior

- decrement, numeric input, and increment controls;
- minimum 1 and selected-SKU stock maximum;
- disabled boundary controls and maximum feedback;
- direct keyboard entry clamped to valid bounds;
- the cart provider remains the only client cart owner;
- a synchronous lock prevents duplicate handling within the same frame;
- success is announced through an `aria-live` region;
- cart badge updates through the existing provider;
- no network success is implied because add-to-cart is intentionally local in this architecture.

## Cart redesign

The former desktop-only table was replaced with responsive `CartItemCard` components:

- Product image/fallback;
- Product link and name;
- Variant label and SKU;
- unit price;
- accessible quantity controls;
- stock maximum feedback;
- item subtotal;
- explicit remove action.

Desktop uses a readable item column and contained sticky summary. Mobile stacks cards and actions with no table compression or horizontal scrolling. The summary preserves the existing `subtotal`, zero shipping value, total, checkout link, continue-shopping link, and Cash on Delivery note.

Cart loading now uses a stable skeleton and empty cart uses the shared Task 1 state component. The cart remains local/synchronous; therefore there is no invented network pending/failure state for quantity or removal. Current server stock/price validation still occurs at checkout.

## Guest checkout behavior

- guest parity is stated without registration pressure;
- fields remain full name, email, phone, and delivery address—the existing backend contract;
- visible required labels, `email`/`tel` types, mobile-friendly inputs, and autocomplete tokens;
- inline blur validation plus first-invalid-field focus on submission;
- form values remain after recoverable errors;
- order review shows item/Variant/quantity/cart values with an explicit note that the server confirms the authoritative total;
- guest success renders only the returned `OrderDto`;
- confirmation includes returned order ID, confirmed items, total, address, Cash on Delivery, possible seller contact, and the true lack of guest account tracking.

No guest personal data is added to local storage.

## Authenticated checkout behavior

- existing `useAuth` prefill for name, email, and phone is preserved;
- prefilled values remain editable for the order;
- checkout does not mutate the account profile;
- purchasing capability is identical to guest checkout;
- confirmed authenticated orders redirect to the existing ownership-protected `/orders/[id]` route;
- the `justPlaced` view now presents a server-fetched confirmation, My Orders link, continue-shopping link, and Cash on Delivery reminder.

## Order confirmation

Guest confirmation is inline because the architecture does not authorize guests to reload an Order route. Authenticated confirmation is loaded from the protected order endpoint and cannot be fabricated from the query parameter: `justPlaced=1` changes presentation only after the authenticated API returns the owned Order.

No email, SMS, delivery estimate, shipment tracking, fake order number, discount, review, rating, wishlist, or return promise was added.

## Accessibility

- semantic breadcrumb navigation and sequential headings;
- labelled gallery and thumbnail controls;
- fieldset/legend option groups;
- announced selection, stock, success, pending, and validation states;
- text accompanies every functional color;
- 44px quantity, option, remove, and primary controls;
- labelled numeric quantity input with min/max;
- visible checkout labels, required indicators, autocomplete, `aria-invalid`, `aria-describedby`, and inline `role=alert`;
- first invalid checkout field receives focus;
- logical source/tab order;
- stable loading states with `aria-busy`;
- all Task 1 focus and reduced-motion behavior retained.

## Responsive behavior

- Product gallery first on mobile; purchase panel follows naturally.
- Options wrap without compressing values.
- Cart switches from three-column cards to stacked mobile cards.
- Cart and checkout summaries are sticky only at desktop width and remain in their layout container.
- Checkout fields use one column on mobile and appropriate two-column grouping on larger screens.
- No essential action relies on hover.
- Chrome rendering was checked at 390px and 1440px widths.

## Security and duplicate-submission controls

- existing same-origin order mutation protection is unchanged;
- existing API rate limiting is unchanged;
- the UUID idempotency key is generated once and retained across recoverable failures;
- it is cleared only after server-confirmed success;
- a ref lock and disabled pending button block repeated Place Order handling;
- the UI explicitly warns against refreshing/resubmitting while confirmation is pending;
- no automatic mutation retry was added;
- raw unexpected backend errors are mapped to safe recovery messages;
- stock/session/rate-limit failures receive useful but non-sensitive messages;
- frontend totals and quantities are described as non-authoritative;
- no token or checkout data is placed in URLs or browser logs.

## Files changed for Task 2

- `ecommerce/src/app/(client)/products/[id]/page.tsx`
- `ecommerce/src/app/(client)/products/[id]/loading.tsx`
- `ecommerce/src/app/(client)/products/[id]/not-found.tsx`
- `ecommerce/src/app/(client)/cart/page.tsx`
- `ecommerce/src/app/(client)/checkout/page.tsx`
- `ecommerce/src/app/(client)/orders/[id]/page.tsx`
- `ecommerce/src/components/products/ProductGallery.tsx`
- `ecommerce/src/components/products/VariantSelector.tsx`
- `ecommerce/src/components/cart/CartItemCard.tsx`
- `ecommerce/src/domain/shopping-journey.ts`
- `ecommerce/tests/unit/shopping-journey.test.ts`
- this report.

Task 1 files remain uncommitted in the same working tree and were preserved.

## Tests added

`tests/unit/shopping-journey.test.ts` covers:

- valid guest delivery details;
- every invalid checkout field;
- value-preserving validation behavior;
- stock-conflict error mapping;
- unexpected-error sanitization and recovery guidance.

Existing tests continue to cover:

- duplicate checkout-line aggregation and deterministic fingerprints;
- excessive aggregate quantity rejection;
- explicit configurable combinations and availability;
- price overrides/base-price fallback;
- inventory/order lifecycle;
- idempotent transactional order creation through integration coverage;
- Simple/Configurable catalogue action rules.

The repository still has no DOM component-test or E2E library, so component behavior was additionally validated with Chrome DevTools Protocol against the running app.

## Exact verification commands and results

| Command | Result |
| --- | --- |
| complete `ui-ux-pro-max` read | PASS |
| journey `--design-system` search | PASS |
| two targeted UX searches | PASS |
| Task 1 `npm run lint` | PASS |
| Task 1 `npm run typecheck` | PASS |
| Task 1 `npm run test:unit` | PASS — 24/24 |
| Task 2 changed-file Prettier write/check | PASS |
| final `npm run lint` | PASS |
| final `npm run typecheck` | PASS |
| final `npm run test:unit` | PASS — 28/28 |
| opt-in `npm run test:integration` with `TEST_DATABASE_URL` | PASS — 5/5 |
| first `npm run build` while `next dev` used the same `.next` volume | FAIL — compiled/typechecked, then the concurrent dev process caused missing page artifacts |
| isolated `docker compose run --rm app npm run build` with app stopped | PASS — 33 static pages generated and all routes emitted |
| `docker compose config --quiet` | PASS |
| `git diff --check` | PASS |
| app health wait after restart | PASS |
| `GET /`, `/products`, `/products/4`, `/cart`, `/checkout` | PASS — HTTP 200 |
| unauthenticated `/admin/dashboard` | PASS — redirected to login |

The successful build logged five existing generic `api_request_failed` messages during static generation but completed all compilation, type, route-generation, and trace steps.

The repository-wide formatter remains affected by the Task 1 documented issue: it scans generated `.next` files and seven pre-existing test files differ from Prettier. All Task 2 files pass a scoped Prettier check.

## Manual and browser checks

Performed:

- Configurable Product desktop at 1440 × 1200;
- Configurable Product mobile at 390 × 1100;
- real Product image rendering;
- explicit Color/RAM/Storage controls;
- no Add to Cart before complete selection;
- explicit `Midnight / 8 GB / 128 GB` selection;
- correct resolved Variant ID 9, SKU `NOVA-MID-8-128`, price 499, stock 10;
- Add to Cart and provider persistence;
- redesigned populated cart content and checkout action;
- guest checkout populated order review;
- empty cart and empty checkout;
- four inline validation errors without an order mutation;
- temporary browser cart cleared after validation;
- Task 1 Home/catalogue HTTP regression;
- admin middleware/access-boundary regression;
- missing-image behavior through component/source review and Task 1 browser evidence;
- out-of-stock/unavailable behavior through existing data tests and component semantics;
- quantity boundary behavior through implementation and provider tests;
- duplicate-click protection through implementation, unit/integration idempotency coverage, and button state review.

Not claimed:

- a real order was placed in the shared development database;
- authenticated browser prefill and final redirect were exercised with a live account;
- a Product with multiple stored images was available for thumbnail interaction;
- network failure was deliberately injected;
- screen-reader software or virtual-keyboard hardware testing.

## Screenshots

- `/tmp/task2-configurable-desktop.png`
- `/tmp/task2-configurable-mobile.png`
- `/tmp/task2-cart-empty.png`
- `/tmp/task2-checkout-empty.png`

## Purchase-flow validation result

PASS for the non-mutating purchase path:

```text
Published Configurable Product
→ explicit valid option combination
→ exact SKU resolution
→ bounded quantity
→ correct cart snapshot/badge
→ cart review
→ guest checkout review
→ accessible validation
```

Order-creation correctness remains covered by the passing integration suite. A live checkout mutation was intentionally not performed against the shared development database.

## Admin regression result

PASS:

- no `src/app/admin` or `src/components/admin` file changed;
- no global Task 2 CSS or token changes were made;
- Task 2 components render only under the existing client route group;
- admin authentication redirect still works;
- lint, typecheck, integration tests, and production build include admin routes without errors.

## Known limitations

- The current test stack lacks jsdom/React Testing Library/Playwright, so gallery, quantity, cart, and form interactions are not component-test files.
- Cart quantity/removal are synchronous local-provider operations; network pending/failure states do not exist until server checkout validation.
- Cart prices and stock are snapshots from add-to-cart time by existing architecture and are revalidated only at checkout.
- The available representative Product had one image, so multi-thumbnail behavior was not manually clicked.
- Integration tests leave generated records in the database supplied through `TEST_DATABASE_URL`; CI should use a disposable test database.
- Building concurrently with `next dev` is unsafe because both share `.next`; isolated build execution succeeds.

## Recommendations for Task 3

1. Apply Task 1/2 primitives to Account, My Orders, Order detail/status, login, and registration.
2. Standardize client order tables into responsive cards without changing immutable snapshots.
3. Add a DOM/E2E test layer and a disposable test database.
4. Add representative multi-image Product seed fixtures for deterministic gallery testing.
5. Add a build script or Compose profile that isolates production build output from the development `.next` volume.
