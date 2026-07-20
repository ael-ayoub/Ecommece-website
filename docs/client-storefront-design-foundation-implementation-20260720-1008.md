# Client Storefront Design Foundation Implementation

Date: 2026-07-20 10:08 (Africa/Nouakchott)

## Summary

Task 1 establishes a client-only storefront design foundation, responsive
navigation, footer, real-data Home page, and coherent Product catalogue states.
The work preserves all existing Product, SKU, inventory, pricing, cart,
authentication, checkout, order, API, and media behavior. No database schema,
API contract, backend service, admin component, or admin route was changed.

## Installed design skill used

The implementation used `ui-ux-pro-max`, located at:

```text
.codex/skills/ui-ux-pro-max/SKILL.md
```

The complete 680-line instruction file was read before planning or editing.
The bundled design-system search was run with:

```text
python3 .codex/skills/ui-ux-pro-max/scripts/search.py \
  "modern premium ecommerce product-first trustworthy restrained depth responsive" \
  --design-system --variance 4 --motion 2 --density 5 \
  -p "E-Commerce Storefront"
```

Supplementary UX searches covered catalogue navigation, search, loading,
accessibility, z-index, and reduced motion. The selected skill was more
appropriate than the broader styling skills because it supplied the required
design-system generation, prioritised UX checklist, responsive rules, and
pre-delivery review in one workflow.

Principles applied:

- accessibility and keyboard operation before decoration;
- mobile-first composition and 44px minimum interactive targets;
- semantic color/elevation/focus/motion tokens;
- product-first content with stable image geometry;
- consistent Lucide vector icons;
- 150–220ms interaction feedback and reduced-motion overrides;
- restrained layered depth instead of WebGL, parallax, or heavy effects;
- URL-canonical search, category, and pagination state;
- clear loading, failure, no-result, and unavailable states.

The skill suggested glassmorphism and parallax for the broad query. Those
recommendations were intentionally limited to a lightly translucent sticky
header because the task explicitly prohibited excessive glass and parallax.

## Repository references inspected

- `README.md`
- `docs/architecture.md`
- `docs/project-structure.md`
- `docs/current-architecture-audit-20260716-1559.md`
- `docs/admin-dashboard-spec.md`
- `docs/product-variant-inventory-implementation-20260716-1731.md`
- `docs/explicit-product-combination-configurator-implementation-20260716-2106.md`
- `docs/product-image-local-storage-implementation-20260720-0920.md`
- `docs/docker-architecture.md`
- current App Router pages, components, hooks, providers, Product/Category
  services, DTOs, global CSS, Tailwind configuration, and test scripts.

No applicable repository `AGENTS.md` exists inside this repository. The only
discovered file is under the separate sibling `mobile_application` project.

## Route and component audit

### Public client routes

- `/` — Home
- `/products` — search, category filters, pagination
- `/products/[id]` — Product images and exact SKU selection
- `/cart`
- `/checkout`

### Authenticated client routes

- `/account`
- `/orders`
- `/orders/[id]`

### Authentication routes

- `/login`
- `/register`

These use the bare `(auth)` layout and are deliberately outside the new client
shell.

### Admin routes

- `/admin/dashboard`
- `/admin/orders` and `/admin/orders/[id]`
- `/admin/products`, create/edit, and Variant management
- `/admin/categories`
- `/admin/clients` and `/admin/clients/[id]`
- `/admin/settings/product-options`

Admin uses `src/app/admin/layout.tsx`, is middleware-protected, and mounts its
own sidebar and realtime indicator.

### Existing shared behavior

- `useAuth` owns the React Query-backed session state.
- `CartProvider` owns local cart hydration and count.
- `listProducts` owns published-only filtering, search, pagination, derived
  SKU stock, availability, price range, and primary image ordering.
- `listCategories` owns category data.
- `ProductCard`, `SearchBar`, `CategoryFilter`, and `Pagination` are client
  catalogue components.
- Admin imports the global `ui/` primitives but does not import any new
  storefront component or class.

## Design direction

The implemented direction is modern premium commerce with high readability,
warm neutral surfaces, a dark primary action, a WCAG-conscious amber accent,
stable Product imagery, and restrained elevation. Depth comes from three
consistent shadow levels, layered hero surfaces, subtle card lift, and framed
images. No 3D runtime, Three.js, WebGL, animation library, remote font, fake
promotion, discount, shipping promise, warranty, or policy was added.

## Design tokens

All new tokens are namespaced `--client-*` and scoped to `.client-storefront`:

- background, surface, muted surface, elevated surface;
- primary/secondary text;
- subtle/strong borders;
- accent, accent hover, accent soft;
- danger, success, and focus ring;
- small/medium/large radii;
- small/medium/large shadows;
- page width;
- fast/base transition durations.

The client hierarchy defines display, section, eyebrow, body, secondary,
price, label, button, and form-control treatment. It uses a performant system
font stack, tabular price figures, controlled line height, and responsive
`clamp()` headings without external font requests.

## Client/admin isolation strategy

`(client)/layout.tsx` now owns the `.client-storefront` scope, skip link,
Header, main target, and Footer. Global CSS contains the existing root theme
unchanged; all new semantic values and component classes are descendants of
the client scope. The admin layout and every admin page/component are
unchanged. `git diff --name-only` contains no `src/app/admin` or
`src/components/admin` path.

## Architecture decisions

- Category data is loaded once in the server Client layout and passed to the
  interactive Header. This avoids a duplicate browser fetch.
- Home loads real Products and categories concurrently through existing
  services.
- `ProductGrid` is the shared grid used by Home and `/products`.
- `catalog-presentation.ts` centralises presentation-only action selection so
  Simple Products can add their sole available SKU while Configurable
  Products always require option selection.
- The Header search navigates to the existing `/products?q=` contract.
- The mobile drawer locks body scroll, focuses its close control, traps Tab
  within the dialog, closes on Escape/navigation/backdrop, and returns focus.
- Account navigation uses the canonical session hook and separates logout
  from normal links.
- No new dependency or backend endpoint was needed.

## Pages redesigned

### Home

- compact product-led hero;
- real category discovery;
- latest published Product grid using actual images/prices/availability;
- honest empty state;
- Cash on Delivery reassurance based on existing business behavior;
- responsive full-width sections and client Footer.

### Product catalogue

- stronger title and results hierarchy;
- responsive labelled search and clear control;
- URL-preserving category filter;
- shared stable Product grid;
- deliberate no-result and no-published-Product states;
- token-aligned loading skeleton and retryable error boundary;
- readable pagination retained without infinite scroll.

## Components created

- `components/storefront/StorefrontContainer.tsx`
- `components/storefront/SectionHeading.tsx`
- `components/storefront/StorefrontState.tsx`
- `components/storefront/Footer.tsx`
- `components/products/ProductGrid.tsx`
- `domain/catalog-presentation.ts`

## Components updated

- `Header` — desktop search/category/account navigation, guest/authenticated
  actions, mobile drawer, cart count, focus management, and logout.
- `ProductCard` — shared presentation model, stable 4:5 media frame, ordered
  image fallback, readable long names, effective price range, status text,
  and correct Simple/Configurable actions.
- `SearchBar` and `CategoryFilter` — scoped semantic styling while preserving
  URL behavior.
- Product loading and error boundaries — coherent storefront state styling.

## Complete files changed

- `ecommerce/src/app/globals.css`
- `ecommerce/src/app/(client)/layout.tsx`
- `ecommerce/src/app/(client)/page.tsx`
- `ecommerce/src/app/(client)/products/page.tsx`
- `ecommerce/src/app/(client)/products/loading.tsx`
- `ecommerce/src/app/(client)/products/error.tsx`
- `ecommerce/src/components/layout/Header.tsx`
- `ecommerce/src/components/products/ProductCard.tsx`
- `ecommerce/src/components/products/ProductGrid.tsx`
- `ecommerce/src/components/products/SearchBar.tsx`
- `ecommerce/src/components/products/CategoryFilter.tsx`
- `ecommerce/src/components/storefront/StorefrontContainer.tsx`
- `ecommerce/src/components/storefront/SectionHeading.tsx`
- `ecommerce/src/components/storefront/StorefrontState.tsx`
- `ecommerce/src/components/storefront/Footer.tsx`
- `ecommerce/src/domain/catalog-presentation.ts`
- `ecommerce/tests/unit/storefront-catalog.test.ts`
- this report.

## Responsive behavior

- 390px screenshots confirm stacked hero controls, two-row Header with
  persistent search/cart/menu access, single-column categories, compact
  catalogue controls, and a stable one-column Product grid.
- Desktop screenshots confirm balanced header/search, two-column hero,
  four-column category/Product grids, and readable search/filter controls.
- Category chips use a contained horizontal scroller on narrow screens rather
  than squeezing labels or overflowing the page.
- Client pages not redesigned in this task retain consistent page width and
  gutters through the client main shell.

## Accessibility work

- skip-to-content link and semantic header/nav/main/footer landmarks;
- one page-level heading on Home and catalogue;
- visible labels for both global and catalogue searches;
- accessible names for icon-only controls;
- `aria-current`, `aria-expanded`, `aria-controls`, `aria-modal`, result
  announcement, alert, busy, and disabled semantics;
- 44px controls and visible focus rings;
- keyboard-operable native category menu;
- mobile focus placement, containment, Escape/backdrop close, and focus return;
- meaningful Product alt text and deliberate broken/missing-image fallback;
- statuses pair color with visible text;
- reduced-motion override scoped to the storefront.

## Tests added or updated

`tests/unit/storefront-catalog.test.ts` covers:

- Simple Product direct add-to-cart eligibility;
- Configurable Product choose-options behavior;
- out-of-stock/unavailable action blocking and labels;
- effective price-range presentation.

The existing test stack has no DOM environment or component-testing library.
No dependency was added solely for this task. Header/menu behavior was
therefore verified by lint/type/build, source inspection, HTTP responses, and
headless browser rendering rather than claimed as automated component tests.

## Verification commands and results

| Command | Result |
| --- | --- |
| `python3 --version` | PASS — Python 3.14.4 |
| required `ui-ux-pro-max --design-system` search | PASS |
| two supplementary UX skill searches | PASS |
| changed-file Prettier check | PASS |
| `npm run lint` | PASS after removal of two stale imports |
| `npm run typecheck` | PASS |
| `npm run test:unit` | PASS — 24/24 |
| `npm test` | PASS — 24 passed, 5 integration tests skipped because the script does not set `TEST_DATABASE_URL` |
| opt-in `npm run test:integration` with the container DB URL | PASS — 5/5 |
| `npm run build` | PASS — production compilation, lint/type validation, and 33 static pages generated |
| `docker compose config --quiet` | PASS |
| `git diff --check` | PASS |
| `GET /api/health` | PASS — ready/database connected |
| `GET /` | PASS — HTTP 200 |
| `GET /products` | PASS — HTTP 200 |
| unauthenticated `GET /admin/dashboard` | PASS — redirected to `/login?redirect=%2Fadmin%2Fdashboard` |
| full `npm run format:check` | FAIL — the script includes generated `.next` output and seven pre-existing unformatted test files |

The files changed by this task pass a direct Prettier check. The full format
check failure was not hidden or corrected with an unrelated repository-wide
rewrite.

The build printed five existing generic `api_request_failed` log entries while
collecting/generating route data. It nevertheless completed successfully with
all routes emitted. No build error was reported.

## Manual validation

Performed:

- guest desktop Header and Home;
- guest mobile Header/search and Home at 390px;
- desktop and mobile Product catalogue;
- cart access and guest Login/Register visibility;
- real category content;
- search controls and category chips;
- missing Product image fallback;
- Simple direct-add and Configurable choose-options actions visible from real
  catalogue data;
- long Product/category names wrapping without card overflow;
- admin access boundary redirect;
- app health after production build and dev-server restart;
- source-level keyboard/focus/reduced-motion/admin-isolation review.

Not claimed:

- authenticated Header/account/logout interaction in a browser;
- mobile drawer click-through automation;
- Product-with-stored-image rendering (the current development catalogue had
  no Product image record in the visible page);
- deliberately forcing API failure or empty database state in the shared
  development database;
- screen-reader software testing.

## Screenshots

Headless Chrome screenshots:

- `/tmp/storefront-home-desktop.png` — 1440 × 1200
- `/tmp/storefront-home-mobile.png` — 390 × 1100
- `/tmp/storefront-products-desktop.png` — 1440 × 1200
- `/tmp/storefront-products-mobile.png` — 390 × 1100

The screenshot data includes integration-test catalogue records because the
opt-in integration suite uses the supplied database and does not self-clean.
Those names demonstrate long-content stability but are not hard-coded UI data.

## Admin regression result

PASS within the available checks:

- no admin route or admin component changed;
- the new token namespace exists only below `.client-storefront`;
- the admin layout does not render Header/Footer or client navigation;
- unauthenticated admin access still redirects through middleware;
- lint, typecheck, integration tests, and production build cover admin modules
  without errors.

## Known limitations

- There is no jsdom/Playwright/React Testing Library dependency, so the full
  requested Header interaction matrix is not automated.
- The full format script scans `.next`; it should eventually exclude generated
  output. Seven pre-existing tests also differ from current Prettier output.
- The opt-in integration suite leaves generated records in whichever database
  is supplied. A dedicated disposable test database and teardown should be
  used in CI.
- Header search submits explicitly; autocomplete was not added because no
  existing suggestions API or state exists.
- Task 1 intentionally does not visually redesign Product Detail, Cart,
  Checkout, Account, or Orders.

## Recommendations for Task 2

1. Apply the same scoped primitives to Product Detail, including gallery,
   breadcrumbs, Variant selection, price, stock, and purchase panel.
2. Redesign Cart and Checkout without changing canonical SKU pricing,
   idempotency, or checkout locking.
3. Add a DOM-capable component test layer or Playwright and use a disposable
   test database before expanding the interaction suite.
4. Add canonical Product images to development seed data so gallery and image
   optimization checks use representative local media.
