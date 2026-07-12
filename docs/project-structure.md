# Project Structure & Architecture — E-Commerce Platform v1

**Author's note:** this document is written from the perspective of a senior software architect explaining _why_ the codebase is organized the way it is — not just _what_ goes where. It is documentation only; no code lives here. It assumes the tech stack and business rules already locked in [architecture.md](architecture.md), [admin-dashboard-spec.md](admin-dashboard-spec.md), and [client-interface-spec.md](client-interface-spec.md).

---

## 1. Project Structure Overview

```
ecommerce-v1/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   ├── services/
│   ├── middleware/
│   ├── constants/
│   └── styles/
├── prisma/
├── public/
├── tests/
├── docs/
├── .env.example
├── .gitignore
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── package.json
└── README.md
```

**One deliberate deviation from a typical starter template worth naming up front:** there is no top-level `src/utils/` folder separate from `src/lib/`. Many Next.js templates have both, and in practice teams can never consistently answer "does this helper go in `lib` or `utils`?" — the distinction rots within weeks. This project merges them: `src/lib/` holds _all_ shared, non-component logic — from a formatting helper to the Prisma client singleton — organized into subfolders by what it does, not by which folder it happened to land in. One less ambiguous boundary to maintain is worth more than the theoretical purity of separating "app logic" from "generic helpers."

Similarly, hooks live in exactly one place — `src/hooks/` — not duplicated between there and a nested `components/hooks/`. A hook is either broadly reusable (belongs at `src/hooks/`) or so specific to one component that it doesn't need to be a named, exported hook at all (it can just be inline logic in that component). Having two candidate homes for the same kind of file is a recurring source of "wait, which one did we use last time?" — so this document collapses it to one.

---

## 2. Detailed Folder Structure with Architectural Reasoning

### 2.1 `src/app/` — Next.js App Router

**Purpose:** every route the platform serves — client pages, admin pages, and API routes — using Next.js 14's file-based App Router.

**Why this structure:** file-based routing means the directory tree _is_ the site map — there's no separate routing config file to keep in sync with reality. Route groups (folders in parentheses, e.g. `(admin)`) let related pages share a layout and be organized together in the file tree without that grouping leaking into the URL.

```
src/app/
├── (auth)/                    # Login/Register — grouped so they can share a bare, header-less layout
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx
├── (client)/                  # Everything a guest/logged-in client browses
│   ├── products/
│   │   ├── page.tsx           # /products
│   │   └── [id]/page.tsx      # /products/:id
│   ├── cart/page.tsx          # /cart
│   ├── checkout/page.tsx      # /checkout
│   ├── orders/                # logged-in only, per architecture.md
│   │   ├── page.tsx           # /orders
│   │   └── [id]/page.tsx      # /orders/:id
│   ├── account/page.tsx       # /account
│   └── layout.tsx             # client header/footer shell
├── (admin)/                   # Everything only role=admin can reach
│   ├── dashboard/page.tsx     # /dashboard — analytics (admin-dashboard-spec.md §3)
│   ├── orders/
│   │   ├── page.tsx           # /orders (admin list — distinct from client's /orders above)
│   │   └── [id]/page.tsx
│   ├── products/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── variants/page.tsx
│   ├── categories/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── clients/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── layout.tsx             # admin sidebar shell (admin-dashboard-spec.md §2)
├── api/
│   ├── auth/{login,register,logout,me}/route.ts
│   ├── products/
│   │   ├── route.ts           # GET (list), POST (admin create)
│   │   ├── [id]/route.ts      # GET/PUT/DELETE
│   │   └── [id]/variants/route.ts
│   ├── categories/{route.ts, [id]/route.ts}
│   ├── cart/route.ts
│   ├── orders/
│   │   ├── route.ts           # GET (own history), POST (place order)
│   │   └── [id]/{route.ts, cancel/route.ts, status/route.ts}
│   ├── admin/analytics/{route.ts, revenue/route.ts, orders-by-status/route.ts, revenue-over-time/route.ts}
│   ├── users/{route.ts, [id]/route.ts}
│   └── health/route.ts
├── layout.tsx                 # Root layout — html/body shell, providers
├── page.tsx                   # Home page (redirects into (client) product listing)
└── error.tsx                  # Global error boundary
```

**Architectural principle — route grouping mirrors the permissions matrix, not convenience.** `(client)` and `(admin)` aren't just a filing convenience: they exist because [architecture.md](architecture.md) Section 6 draws a hard permissions line between what a client can reach and what only the admin can. Grouping by that line means the middleware that enforces it (Section 2.5 below) can target a whole group at once (`/app/(admin)/**`) instead of listing every individual admin route by hand — the file structure enforces the business rule instead of merely reflecting it.

**Note on the `orders` naming collision:** `(client)/orders` and `(admin)/orders` are two different route trees that happen to share a folder name — this is intentional and safe, since route groups don't merge; `/orders` (client, own history) and `/admin/orders`-equivalent (via the admin layout) never collide in the actual URL space. It's called out here specifically so it isn't mistaken for a bug later.

**Dependencies:** page and layout files import from `components/`, `hooks/`, `types/`; API route files import from `services/` and `middleware/` — never directly from `lib/db.ts` inside a page component (see the layering rule in Section 3).

### 2.2 `src/components/`

**Purpose:** all React components, organized so a component's location tells you its scope — is it a generic UI primitive, a layout shell, or specific to one feature?

```
src/components/
├── ui/            # shadcn/ui primitives: button.tsx, input.tsx, card.tsx, modal.tsx, badge.tsx, table.tsx...
├── layout/        # Header.tsx, Sidebar.tsx, Footer.tsx, MainLayout.tsx
├── auth/          # LoginForm.tsx, RegisterForm.tsx, ProtectedRoute.tsx
├── products/      # ProductCard.tsx, ProductGrid.tsx, ProductDetail.tsx, ProductForm.tsx, VariantSelector.tsx, ProductSearch.tsx, CategoryFilter.tsx
├── cart/          # CartItem.tsx, CartSummary.tsx, EmptyCart.tsx
├── orders/        # OrderList.tsx, OrderDetail.tsx, OrderStatus.tsx, OrderForm.tsx, OrderConfirmation.tsx
├── admin/
│   ├── analytics/ # RevenueChart.tsx, OrdersChart.tsx, KPICard.tsx, RecentOrders.tsx
│   ├── orders/    # AdminOrderList.tsx, AdminOrderDetail.tsx, StatusChangeForm.tsx
│   ├── products/  # AdminProductList.tsx, AdminProductForm.tsx, VariantManager.tsx
│   ├── categories/# AdminCategoryList.tsx, AdminCategoryForm.tsx
│   ├── clients/   # AdminClientList.tsx, AdminClientDetail.tsx
│   └── RealtimeOrderWatcher.tsx   # owns the Supabase Realtime subscription for admin pages
└── common/        # Loading.tsx, ErrorBoundary.tsx, Pagination.tsx, StatusBadge.tsx, ConfirmModal.tsx, Toast.tsx
```

**Why this structure — a three-tier scope hierarchy:**

1. `ui/` — zero business meaning. A `Button` doesn't know it's rendering "Mark Shipped"; it just renders a button. These are pure, swappable, and shadcn/ui owns their baseline implementation.
2. `layout/` and `common/` — reused across _every_ feature but carry a little more shape than raw UI primitives (a `StatusBadge` knows about the six order statuses; a `Pagination` knows about page numbers). Still no domain/business logic.
3. Feature folders (`products/`, `cart/`, `orders/`, `admin/*`) — components that know about the domain. `OrderStatus.tsx` knows the six-state lifecycle from [architecture.md](architecture.md) Section 3; `VariantManager.tsx` knows a variant can be enabled/disabled but not deleted.

The `admin/` subtree is nested one level deeper than the other feature folders specifically because it mirrors the route grouping in `app/(admin)/` — the same permissions boundary shows up in the component tree, reinforcing (not duplicating) the routing decision. `RealtimeOrderWatcher.tsx` is deliberately its own component rather than logic buried inside `AdminOrderList.tsx`, because the Realtime subscription needs to live at a level that outlives any single list (e.g., mounted once in the admin layout) and feed updates down — isolating it makes it the one place to look when debugging "why didn't the list update."

**Dependencies:** components import from `hooks/`, `types/`, and `ui/` — never from `services/` or `lib/db.ts` directly. A component that needs data calls a hook; the hook calls the API. This keeps every component testable by mocking one hook, rather than mocking a database client.

### 2.3 `src/lib/`

**Purpose:** shared logic that isn't a component and isn't a domain service — the toolbox everything else reaches into.

```
src/lib/
├── db.ts              # Prisma client singleton (see architecture.md's dev-mode multi-instance concern)
├── auth.ts             # JWT sign/verify, bcrypt hash/compare
├── validators.ts        # Zod schemas for request bodies (register, login, place-order, product form...)
├── errors.ts             # Custom error classes (NotFoundError, ValidationError, ForbiddenError...)
├── api-client.ts          # Client-side fetch wrapper — attaches auth header, parses JSON, normalizes errors
├── realtime.ts             # Supabase Realtime client setup + subscribe/unsubscribe helpers
├── cloudinary.ts            # Cloudinary SDK init + upload/delete wrappers
├── format.ts                 # Currency, date formatting shared by admin and client UI
└── calculations.ts             # Cart/order total math (shared so client-side preview and server-side total never drift)
```

**Why this structure:** everything here is a _utility a service or a component reaches for_, never a thing that owns business rules on its own. `db.ts` is the one and only place `new PrismaClient()` is called — every other file imports the singleton from here, which is what prevents the classic Next.js dev-mode "too many database connections" bug. `calculations.ts` deserves particular emphasis: order total math is computed in exactly one function, imported both by the cart-preview UI and by the order-placement service, so the number the client sees before checkout and the number the server actually charges can never silently diverge.

**Dependencies:** `lib/` may import from `types/` and `constants/`, and from third-party packages (Prisma, jsonwebtoken, bcrypt, Cloudinary SDK, Supabase client). It must never import from `components/` or `app/` — logic flows one direction, down from routes/components into lib, never back up.

### 2.4 `src/types/`

**Purpose:** the single source of truth for what a `User`, `Product`, `Order`, etc. look like in TypeScript — separate from the Prisma-generated types, because not every type used in the app is a 1:1 database row (e.g., an API response shape, a form's input shape, a JWT payload).

```
src/types/
├── index.ts     # barrel re-export
├── user.ts
├── product.ts
├── order.ts       # includes the OrderStatus union/enum mirrored from Prisma
├── cart.ts
├── api.ts          # generic request/response wrapper types
└── auth.ts          # JWT payload shape, session shape
```

**Why this structure:** organizing by domain (not by "requests" vs. "responses" vs. "models") means anyone touching an Order-related feature opens exactly one file to see everything Order-shaped, instead of hunting across three generic files. `index.ts` exists purely so the rest of the app can write `import { Order, OrderStatus } from "@/types"` instead of remembering which domain file each type lives in — a small convenience that removes a whole class of "where was that type again" friction.

### 2.5 `src/middleware/`

**Purpose:** the enforcement point for authentication and role checks — the code that actually reads the permissions matrix from [architecture.md](architecture.md) Section 6 and turns it into "reject this request."

```
src/middleware/
├── auth.ts           # verifies the JWT on incoming requests, attaches the decoded user to the request context
├── adminOnly.ts        # rejects (403) if the verified user's role isn't 'admin'
└── errorHandler.ts       # catches thrown errors from services/routes, maps them to consistent HTTP responses
```

**Why this exists as its own top-level folder, not folded into `lib/`:** authorization is the one category of logic in this codebase where a bug is a security incident, not a UI glitch. Giving it a dedicated, small, easy-to-audit folder — rather than letting it blend in among formatting helpers — is a deliberate signal: "if you're touching anything in here, slow down and think about the permissions matrix." Every admin API route and every admin page's server-side check runs through `adminOnly.ts`; there is exactly one implementation of "is this an admin," not one per route.

### 2.6 `src/services/`

**Purpose:** where business rules actually live — order placement, stock decrement/restore, status transition validation, analytics aggregation. This is the layer that knows _how the business works_, independent of HTTP or React.

```
src/services/
├── product.service.ts       # create/update/list/search products
├── order.service.ts           # place order, validate transitions, cancel, mark returned/delivered/etc.
├── cart.service.ts              # add/remove/update cart items, compute totals
├── auth.service.ts                # register, login, issue JWT
├── analytics.service.ts             # KPI + chart aggregations
├── category.service.ts                # category CRUD, "has products" check before delete
├── user.service.ts                      # profile fetch/update, admin client listing
└── inventory.service.ts                   # the one place stock is ever decremented or restored, wrapped in a Prisma transaction (architecture.md §14)
```

**Why this is the most important architectural decision in the whole structure:** an API route file (`app/api/orders/route.ts`) should be almost boring to read — parse the request, call `orderService.createOrder(...)`, return the result. If business logic lived directly inside route handlers, two problems compound over time: (1) the same rule (e.g., "a Pending order can only be cancelled by its owner") gets copy-pasted wherever it's needed and drifts out of sync, and (2) you can't test "does cancelling an order restore stock correctly" without spinning up an HTTP server. Pulling that logic into `order.service.ts` means it's one function, testable in isolation, called from exactly the routes that need it — and if a future admin bulk-action or a background job ever needs to cancel an order, it calls the same service function instead of reimplementing the rule.

`inventory.service.ts` gets its own file rather than living inside `order.service.ts`, specifically because stock locking (Section 14 of architecture.md) is the single most concurrency-sensitive piece of logic in the entire platform — isolating it makes it the one file to review carefully whenever the race-condition behavior needs to change, rather than a few lines buried in a much longer order-placement function.

**Dependencies:** services import from `lib/` (the Prisma client, calculations, errors) and `types/` — never from `components/`. Services are the only layer allowed to call `db.ts` directly.

### 2.7 `src/constants/`

**Purpose:** the fixed vocabulary of the app — values that must stay identical everywhere they're referenced.

```
src/constants/
├── order-status.ts     # the six statuses + their badge colors/labels (admin-dashboard-spec.md §9 and client-interface-spec.md §8's timeline both read from here)
├── roles.ts               # ADMIN / CLIENT
├── api-routes.ts            # endpoint path strings, so a route rename is a one-file change
└── messages.ts                 # user-facing strings for common states — "Your cart is empty. Start shopping!", "No products match your search." etc, pulled directly from client-interface-spec.md §15
```

**Why this exists separately from `types/`:** types describe _shape_; constants describe _fixed values_. The order status badge colors are a perfect example of something that must be defined exactly once — if yellow-for-Pending were hardcoded separately in the admin Orders table, the admin order-detail timeline, and the client's My Orders page, a future color change would require finding and updating three places instead of one, with the near-certainty that one gets missed.

### 2.8 `src/styles/`

```
src/styles/
├── globals.css       # Tailwind directives + global resets
├── variables.css        # CSS custom properties (if any values fall outside Tailwind's theme)
└── animations.css          # any custom keyframes not covered by Tailwind's defaults
```

Tailwind + shadcn/ui (per architecture.md's tech stack) covers the overwhelming majority of styling needs through utility classes and `tailwind.config.ts` theme tokens — this folder is intentionally small, existing only for the handful of things that don't fit the utility-class model (global resets, keyframe animations).

### 2.9 `prisma/`

```
prisma/
├── schema.prisma          # single source of truth for every entity in architecture.md §2
├── migrations/
│   ├── 20260101_init/migration.sql
│   ├── 20260115_add_variant_stock/migration.sql
│   └── ...                  # one folder per applied migration, named by Prisma automatically
└── seed.ts                    # sample categories/products/variants for local dev
```

**Why:** `schema.prisma` is both documentation and executable truth — anyone can read it top to bottom and understand every table and relation without cross-referencing separate ER diagrams. The `migrations/` folder is Prisma-managed and append-only by convention: migrations are never edited after being applied to a shared environment, only added — this is what makes the schema's history reproducible across every developer's machine and every deployment target. `seed.ts` exists purely to make local development possible without manually clicking through the admin UI to create a category, a product, and a variant before you can test a checkout flow.

### 2.10 `public/`

```
public/
├── images/       # logo.svg, hero.jpg, placeholder product image
├── fonts/          # only if not using next/font with Google Fonts
└── favicons/         # favicon.ico
```

Anything here is served byte-for-byte with no build step — it exists for genuinely static assets, not product images (those are Cloudinary URLs per architecture.md, deliberately kept out of the repo and out of `public/` since they're user-generated and would bloat the deployment).

### 2.11 `tests/`

```
tests/
├── unit/
│   ├── services/    # order.service.test.ts, inventory.service.test.ts, ...
│   └── lib/           # calculations.test.ts, validators.test.ts, ...
├── integration/
│   └── api/              # auth.test.ts, orders.test.ts, ...
├── e2e/
│   ├── guest-checkout.test.ts
│   └── admin-order-management.test.ts
└── setup.ts
```

**Honest framing for v1:** this folder is included as a placeholder/template, not a v1 deliverable — the project structure is _test-ready_ (business logic lives in `services/`, precisely so it's unit-testable without an HTTP layer in the loop) even though writing the full test suite is not a locked v1 task. Structuring the code this way now is what keeps "add tests" a v2 addition rather than a v2 rewrite.

### 2.12 `docs/`

```
docs/
├── architecture.md          # system-wide architecture, entities, lifecycle, tech stack (existing)
├── admin-dashboard-spec.md    # admin UI spec (existing)
├── client-interface-spec.md     # client UI spec (existing)
├── project-structure.md           # this document
├── setup.md                         # local dev environment setup (v2/as-needed)
└── deployment.md                      # expands on architecture.md §18's checklist (v2/as-needed)
```

### 2.13 Root configuration files

| File                 | Purpose                                                                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`       | Dependencies (`next`, `react`, `typescript`, `prisma`, `@tanstack/react-query`, `recharts`, `zod`, `jsonwebtoken`, `bcrypt`, `@supabase/supabase-js`, `cloudinary`, `tailwindcss`) and scripts (`dev`, `build`, `start`, `prisma migrate`, `prisma generate`, `prisma db seed`) |
| `tsconfig.json`      | Strict mode enabled; path aliases (`@/components`, `@/lib`, `@/services`, `@/types`, etc.) so imports never need long relative `../../../` chains                                                                                                                               |
| `next.config.js`     | Cloudinary listed as an allowed remote image domain (for `next/image`); no other special build config expected for v1                                                                                                                                                           |
| `tailwind.config.ts` | Theme tokens (colors, spacing) and shadcn/ui's required configuration                                                                                                                                                                                                           |
| `.env.example`       | Every environment variable name the app needs, with placeholder/blank values — `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_*`, `SUPABASE_*` — committed to the repo so no one has to guess what to set                                                                            |
| `.gitignore`         | Must exclude `.env`, `.env.local`, `node_modules`, `.next`, and any Prisma-generated client output                                                                                                                                                                              |
| `README.md`          | Quick-start (clone → install → set env → migrate → dev), a one-paragraph tech stack summary, and links into `docs/` for anything deeper                                                                                                                                         |

---

## 3. Architectural Principles & Decisions

### 3.1 Layer separation — the core rule this whole structure exists to enforce

```
Presentation Layer        components/, app/**/page.tsx
        │  (calls via hooks)
Data-fetching Layer       hooks/, lib/api-client.ts
        │  (HTTP request)
API Layer                 app/api/**/route.ts
        │  (thin: validate → call service → respond)
Service Layer             services/
        │  (business rules; the only layer allowed to reach the DB)
Data Layer                lib/db.ts (Prisma) → PostgreSQL
```

Each layer only talks to the layer directly below it. A component never imports Prisma. An API route never contains a `SELECT`-equivalent Prisma query inline — it calls a service function that does. This isn't bureaucracy for its own sake: it's what makes it possible to change _how_ an order is placed (say, adding a new validation rule) by editing one function in `order.service.ts`, with confidence that every entry point into order placement (the checkout API, and someday an admin "create order on behalf of a client" feature) automatically gets the fix.

### 3.2 Route structure mirrors the permissions model, not just the URL space

As covered in Section 2.1: `(client)` vs `(admin)` route groups exist because [architecture.md](architecture.md)'s permissions matrix is the actual reason these pages are separated — the file tree is a direct expression of who's allowed to see what, which is also what lets a single `adminOnly` middleware check protect an entire subtree at once instead of being manually applied route-by-route (and forgotten on the next new admin page).

### 3.3 One canonical location per concern

Repeated through this document: one Prisma client (`lib/db.ts`), one place stock math happens (`lib/calculations.ts` for previews, `services/inventory.service.ts` for the authoritative transactional version), one status-color mapping (`constants/order-status.ts`), one hooks folder. Every time this document had to choose between "two plausible homes for a file" and "one enforced home," it chose one — because in a real project, ambiguity about "where does this go" is what produces near-duplicate files six months in, each slightly different, each a latent bug.

### 3.4 Business logic is framework-agnostic where it can be

Everything in `services/` is written so it _could_ be called from something other than a Next.js API route — a script, a future admin bulk-action, a test file — without modification. This isn't a hypothetical for its own sake; it's the direct enabler of `tests/` being meaningful later without a rewrite, and of the inventory-locking logic in Section 2.6 being auditable as a single, isolated unit.

### 3.5 The structure says no to a few things on purpose

- No `redux/` or global state library folder — React Query (already in the stack per architecture.md) plus a handful of hooks (`useAuth`, `useCart`) is sufficient for v1's actual state needs; adding a heavier state management layer would be solving a problem this app doesn't have.
- No `graphql/` — the API is REST, matching the endpoint list already locked in architecture.md; introducing a second query paradigm here would contradict a decision already made.
- No separate `microservices` or multi-package monorepo structure — v1 is one Next.js app, one deployable, per the "single Vercel project" deployment decision; a monorepo's benefits (independent deploys, shared internal packages) don't apply to a single-app v1 and would only add tooling overhead.

---

## Cross-references

- Entities, lifecycle, API endpoint list, tech stack: [architecture.md](architecture.md)
- Admin-facing pages this structure serves: [admin-dashboard-spec.md](admin-dashboard-spec.md)
- Client-facing pages this structure serves: [client-interface-spec.md](client-interface-spec.md)
