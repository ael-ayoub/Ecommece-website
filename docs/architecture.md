# E-Commerce Platform — Architecture Overview (v1)

**Payment method:** Cash on Delivery (COD) only
**Users:** Admin (marketplace owner) and Clients (buyers, logged-in or guest)
**Status:** v1 scope only. See "Deferred to v2" at the end for explicitly excluded features.

---

## 1. System Architecture Overview

### 1.1 High-level component view

```
                          ┌─────────────────────┐
                          │        Admin         │
                          │  (marketplace owner)  │
                          └──────────┬───────────┘
                                     │ manages products, categories,
                                     │ views/updates orders
                                     ▼
┌──────────────┐          ┌─────────────────────┐          ┌──────────────┐
│ Logged-in     │ ───────▶│                     │◀──────── │ Guest         │
│ Client        │         │   Backend / API     │          │ Client        │
│ (browse, cart,│◀─────── │   + Database        │ ───────▶ │ (browse, cart,│
│  order, track)│         │                     │          │  checkout only)│
└──────────────┘          └─────────────────────┘          └──────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │  Database (source of │
                          │  truth for products, │
                          │  stock, orders, users)│
                          └─────────────────────┘
```

There is a single backend/API and a single database. Admin and clients are both authenticated users of the same system, differentiated by role. Guests are unauthenticated visitors who can browse and check out, but have no account and no order history.

### 1.2 User journeys

**Admin workflow**

1. Logs in.
2. Creates categories.
3. Creates products, assigns each product to one category, adds variants with stock levels per variant.
4. Monitors incoming orders (all orders, from both guests and logged-in clients).
5. Moves each order through its lifecycle: Pending → Confirmed → Shipped → Delivered, or diverts it to Cancelled/Returned at any point.
6. Order history persists regardless of outcome — nothing is deleted.

**Logged-in client workflow**

1. Registers/logs in.
2. Browses/searches products by name, description, or category.
3. Adds product variants to cart.
4. Checks out — contact/shipping info can be auto-filled from their profile.
5. Order is linked to their account; they can view order status and history at any time.
6. While an order is still Pending, they may cancel it themselves.

**Guest client workflow**

1. Browses/searches products and adds to cart without an account.
2. Checks out by manually supplying email, name, and phone.
3. Order is created but is **not linked to any account** — the guest has no way to look it up again after checkout (no tracking).
4. The order is fully visible to admin like any other order.

### 1.3 Data flow: order placement → confirmation → shipment → delivery

```
[Client/Guest]              [Backend]                          [Database]
     │  place order  ──────▶  │  validate stock per variant ───▶ read stock
     │                        │  create Order + OrderItems  ───▶ write order
     │                        │  decrement variant stock    ───▶ write stock
     │◀─── order confirmation ┤
     │        (Pending)       │

[Admin]                     [Backend]                          [Database]
     │  set status=Confirmed ▶│  update Order.status        ───▶ write order
     │  set status=Shipped   ▶│  update Order.status        ───▶ write order
     │  set status=Delivered ▶│  update Order.status        ───▶ write order
```

Stock only moves at two moments in the entire lifecycle: **order placement** (decrement) and **cancel/return** (restore). Confirm/ship/deliver are pure status changes with no inventory impact.

---

## 2. Database Entities & Relationships

### 2.1 User

Represents both admins and clients — a single table distinguished by role.

| Field         | Purpose                                         |
| ------------- | ----------------------------------------------- |
| id            | Primary key                                     |
| name          | Display name                                    |
| email         | Unique login identifier                         |
| password_hash | Credential storage                              |
| phone         | Contact number, also used at checkout auto-fill |
| role          | `admin` or `client`                             |
| created_at    | Audit/history                                   |

**Relationships:** One User has many Orders (as the placing customer, only for logged-in checkouts). One User (admin) implicitly manages all Products/Categories/Orders — this is a permission, not a foreign-key relationship.

**Why it exists:** Single identity table simplifies auth; role field drives permission checks everywhere else.

### 2.2 Category

Groups products for browsing/filtering.

| Field      | Purpose                        |
| ---------- | ------------------------------ |
| id         | Primary key                    |
| name       | Display label                  |
| slug       | URL-friendly unique identifier |
| created_at | Audit                          |

**Relationships:** One Category has many Products. One Product belongs to exactly one Category (business rule, not optional).

### 2.3 Product

The sellable item, before variant-specific detail.

| Field       | Purpose                                        |
| ----------- | ---------------------------------------------- |
| id          | Primary key                                    |
| category_id | FK → Category (required, single category)      |
| name        | Product title                                  |
| description | Used in text search                            |
| base_price  | Default price (variants may override, see 2.4) |
| images      | Product photos                                 |
| is_active   | Soft-disable without deleting                  |
| created_at  | Audit                                          |

**Relationships:** One Product has many ProductVariants. One Product belongs to one Category.

**Why it exists:** Holds shared descriptive data (name, description, images, category) that all variants of the same item share, so it isn't duplicated per variant.

### 2.4 ProductVariant

The actual purchasable unit — a specific size/color/etc. combination of a Product, and the only place stock is tracked.

| Field          | Purpose                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| id             | Primary key                                                             |
| product_id     | FK → Product                                                            |
| variant_label  | e.g. "Red / Large"                                                      |
| price          | Optional override of product base_price                                 |
| stock_quantity | Units available — **decremented/restored here, never at product level** |
| is_active      | Enable/disable a specific variant without touching the product          |
| created_at     | Audit                                                                   |

**Relationships:** Many ProductVariants belong to one Product. One ProductVariant appears in many OrderItems (across different orders, over time).

**Why it exists:** Real stock and pricing live at the variant granularity — a product itself is never "in stock," only its variants are.

### 2.5 Cart / CartItem

Pre-order staging area, used by both guests (session/local) and logged-in clients (persisted).

**Cart**

| Field      | Purpose                                                      |
| ---------- | ------------------------------------------------------------ |
| id         | Primary key                                                  |
| user_id    | FK → User, nullable (null = guest cart, session/client-side) |
| created_at | Audit                                                        |

**CartItem**

| Field              | Purpose             |
| ------------------ | ------------------- |
| id                 | Primary key         |
| cart_id            | FK → Cart           |
| product_variant_id | FK → ProductVariant |
| quantity           | Units requested     |

**Relationships:** One Cart has many CartItems. One CartItem references exactly one ProductVariant.

**Why it exists:** Lets a buyer accumulate variant selections before committing to an order. For guests this may be implemented client-side/session-based rather than a DB row — either way, it is transient and is converted into an Order + OrderItems at checkout, then discarded.

### 2.6 Order

The confirmed intent to purchase; the durable record admin manages.

| Field            | Purpose                                                           |
| ---------------- | ----------------------------------------------------------------- |
| id               | Primary key                                                       |
| user_id          | FK → User, nullable (null = guest order)                          |
| guest_name       | Filled only for guest checkout                                    |
| guest_email      | Filled only for guest checkout                                    |
| guest_phone      | Filled only for guest checkout                                    |
| shipping_address | Delivery destination                                              |
| status           | Enum: Pending, Confirmed, Shipped, Delivered, Returned, Cancelled |
| total_amount     | Snapshot of order total at placement                              |
| created_at       | Order placed timestamp                                            |
| updated_at       | Last status change                                                |

**Relationships:** One Order has many OrderItems. One Order optionally belongs to one User (null for guest orders).

**Why it exists:** This is the system of record for what was bought, at what price, in what state — independent of later product/price changes.

### 2.7 OrderItem

A line item within an order — the frozen record of one variant, quantity, and price at time of purchase.

| Field                  | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| id                     | Primary key                                                      |
| order_id               | FK → Order                                                       |
| product_variant_id     | FK → ProductVariant                                              |
| product_name_snapshot  | Name at time of purchase (survives later product edits/deletion) |
| variant_label_snapshot | Variant label at time of purchase                                |
| unit_price_snapshot    | Price at time of purchase                                        |
| quantity               | Units ordered                                                    |

**Relationships:** Many OrderItems belong to one Order. Each OrderItem references exactly one ProductVariant (this _is_ the "OrderItemVariant" concept — v1 does not need a separate join table since one OrderItem = one variant + quantity).

**Why it exists:** Decouples historical orders from live product data — if a product/variant is later edited, renamed, repriced, or deactivated, past orders still show what the customer actually saw and paid.

### 2.8 Entity relationship summary

```
User (1) ────────< Order (many)             [nullable — guest orders have no User]
Category (1) ────< Product (many)
Product (1) ─────< ProductVariant (many)
Cart (1) ─────────< CartItem (many) >───── ProductVariant (1)
Order (1) ────────< OrderItem (many) >───── ProductVariant (1)
```

---

## 3. Order Lifecycle State Machine

### 3.1 States

`Pending → Confirmed → Shipped → Delivered`
with `Cancelled` and `Returned` as exit states reachable from various points.

### 3.2 Transition table

| From      | To                | Triggered by                   | Inventory effect              | Notes                                                        |
| --------- | ----------------- | ------------------------------ | ----------------------------- | ------------------------------------------------------------ |
| —         | Pending           | Client/Guest (order placement) | Stock decremented per variant | Initial state on checkout                                    |
| Pending   | Confirmed         | Admin                          | None                          | Admin has reviewed and accepted the order                    |
| Pending   | Cancelled         | Client (self) or Admin         | Stock restored                | Client can only cancel while still Pending                   |
| Confirmed | Shipped           | Admin                          | None                          |                                                              |
| Confirmed | Cancelled         | Admin only                     | Stock restored                | Client can no longer cancel once Confirmed                   |
| Shipped   | Delivered         | Admin                          | None                          | Normal completion                                            |
| Shipped   | Returned          | Admin                          | Stock restored                | Post-shipment reversal                                       |
| Delivered | Returned          | Admin                          | Stock restored                | Post-delivery reversal                                       |
| Any state | (further changes) | —                              | —                             | Cancelled/Returned are terminal — no further transitions out |

### 3.3 Who can trigger what

- **Client:** may only transition their own order from `Pending → Cancelled`. No other transitions available to clients. Guests cannot trigger any transition (no way to identify/authenticate their order).
- **Admin:** may transition an order forward through the normal sequence (Confirmed → Shipped → Delivered) and may move an order to `Cancelled` or `Returned` from **any** non-terminal state.

### 3.4 Order visibility

Orders are **never deleted**, regardless of status. Cancelled and Returned orders remain in the database and in the admin's order list permanently, forming a complete history. For logged-in clients, their own order history also permanently shows all past orders including cancelled ones. Guest orders remain visible to admin only (guest has no login to view them again).

---

## 4. Inventory Management Rules

- **Decrement point:** stock for each ordered ProductVariant is decremented at the moment an Order is successfully placed (state: Pending), not at cart-add time.
- **Restore point:** stock is restored instantly and fully when an Order transitions to `Cancelled` or `Returned`, for every OrderItem in that order.
- **Granularity:** stock is tracked exclusively on `ProductVariant.stock_quantity`. A Product itself has no stock field — "is this product in stock" is derived by checking whether any of its active variants have `stock_quantity > 0`.
- **Overselling:** not allowed. Placing an order must validate that every requested variant has sufficient `stock_quantity` at the moment of order creation; insufficient stock rejects the order (or that line item) before any Order/OrderItem rows are written and before any decrement happens.
- **All-or-nothing on reversal:** cancelling or returning an order restores stock for _all_ OrderItems in that order together — v1 does not support partial-item cancellation/return.
- **Querying available stock for a product:** sum or list `stock_quantity` across all active ProductVariants belonging to that Product; a product page shows per-variant availability (e.g., "Red/Large: 3 left, Blue/Small: out of stock") rather than a single aggregate number.

---

## 5. API Endpoint Structure (names only)

### Authentication

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me
```

### Admin

```
POST   /admin/categories
GET    /admin/categories
PUT    /admin/categories/:id
DELETE /admin/categories/:id

POST   /admin/products
PUT    /admin/products/:id
DELETE /admin/products/:id            (soft delete — see 8. Business Rules)

POST   /admin/products/:id/variants
PUT    /admin/products/:id/variants/:variantId          (edit price/label/stock)
PUT    /admin/products/:id/variants/:variantId/status   (enable/disable)

GET    /admin/orders                  (list all, filterable by status)
GET    /admin/orders/:id
PUT    /admin/orders/:id/status       (Confirmed / Shipped / Delivered / Returned / Cancelled)

GET    /admin/users                   (list clients/admins)
```

### Client / Guest

```
GET    /products                      (filters: category, search query)
GET    /products/:id                  (includes variants + stock per variant)
GET    /categories

GET    /cart
POST   /cart                          (add item)
PUT    /cart/:itemId                  (update quantity)
DELETE /cart/:itemId                  (remove item)

POST   /orders                        (create — guest fields optional if logged in)
GET    /orders                        (logged-in only — own order history)
GET    /orders/:id                    (logged-in only — own order, ownership-checked)
PUT    /orders/:id/cancel             (logged-in only, order must be Pending)

GET    /users/me                      (profile, for auto-fill at checkout)
PUT    /users/me                      (update own profile)
```

---

## 6. User Roles & Permissions Matrix

| Capability                           |           Admin           | Logged-in Client |             Guest             |
| ------------------------------------ | :-----------------------: | :--------------: | :---------------------------: |
| Browse/search products               |             ✓             |        ✓         |               ✓               |
| View categories                      |             ✓             |        ✓         |               ✓               |
| Add to cart                          | ✓ (as buyer, not typical) |        ✓         |               ✓               |
| Checkout / place order               |             ✓             |        ✓         | ✓ (name/email/phone required) |
| View own order history               |             ✓             |        ✓         |        ✗ (no tracking)        |
| View any single order they placed    |             ✓             |   ✓ (own only)   |               ✗               |
| Cancel own Pending order             |            n/a            |        ✓         |               ✗               |
| Create/edit/delete products          |             ✓             |        ✗         |               ✗               |
| Create/edit categories               |             ✓             |        ✗         |               ✗               |
| Add/edit product variants & stock    |             ✓             |        ✗         |               ✗               |
| View all orders (all customers)      |             ✓             |        ✗         |               ✗               |
| Change order status (any transition) |             ✓             |        ✗         |               ✗               |
| Cancel/return order at any state     |             ✓             |        ✗         |               ✗               |
| List/view users                      |             ✓             |        ✗         |               ✗               |

---

## 7. Data Flow Examples

### Scenario A — Logged-in user: order → confirm → ship → deliver

1. Client adds variant(s) to their persisted Cart.
2. Client checks out: backend validates stock, creates `Order` (status=Pending, `user_id` set), creates `OrderItem` rows with snapshotted name/price, decrements `ProductVariant.stock_quantity` for each item, clears the Cart.
3. Client sees the order in `GET /orders` with status Pending.
4. Admin reviews it in `GET /admin/orders`, calls `PUT /admin/orders/:id/status` → Confirmed. No stock change. Client now sees status Confirmed.
5. Admin updates status → Shipped. No stock change. Client sees Shipped.
6. Admin updates status → Delivered. No stock change. Order is now complete; it remains permanently in both the client's history and admin's list.

### Scenario B — Guest order, admin never confirms

1. Guest checks out with name/email/phone (no account). `Order` created with `user_id = null`, guest fields populated, status=Pending. Stock decremented.
2. Guest has no way to look this order up again — there is no tracking endpoint for guests, and no login to associate it with.
3. Guest **cannot** cancel it (cancellation requires `PUT /orders/:id/cancel`, which is logged-in-only and ownership-checked).
4. The order is fully visible to admin in `GET /admin/orders` and can sit in Pending indefinitely, or admin may act on it (confirm/cancel) whenever they choose.
5. If it sits Pending forever, the stock it decremented remains decremented (reserved) until an admin explicitly cancels/returns it — there is no automatic expiry in v1.

### Scenario C — Admin marks an order Returned

1. Admin calls `PUT /admin/orders/:id/status` with target Returned. Valid from Shipped or Delivered.
2. `Order.status` updates to Returned; `updated_at` timestamp updates.
3. For every `OrderItem` on that order, the corresponding `ProductVariant.stock_quantity` is incremented back by the ordered quantity — all items restore together.
4. The order is **not** deleted or hidden — it remains visible to the customer (if logged-in) in their order history showing status Returned, and remains in admin's full order list.

### Scenario D — Client cancels their own Pending order

1. Client calls `PUT /orders/:id/cancel`. Backend checks: order belongs to this user AND status is currently Pending — otherwise rejected.
2. `Order.status` → Cancelled.
3. Stock for every OrderItem on the order is restored (incremented back) immediately.
4. The order stays in the client's order history, permanently shown as Cancelled — it does not disappear.
5. Yes, the client can immediately place a new order for the same variants — this is a brand-new Order/OrderItem set with fresh stock validation; it is entirely independent of the cancelled one (no relationship between them, no reuse of the old order record).

---

## 8. Business Rules & Constraints

- Stock (`ProductVariant.stock_quantity`) can never go negative; orders that would cause this are rejected at placement.
- A Product belongs to exactly one Category — never zero, never many.
- Once an Order leaves Pending (i.e., is Confirmed or later), its OrderItems are frozen — no items/quantities can be added, removed, or edited by anyone.
- Cancelled and Returned are terminal states — an order in either state cannot be transitioned anywhere else, by admin or client.
- A ProductVariant must always belong to exactly one Product — it cannot exist independently.
- A Client can only cancel an order that (a) belongs to them and (b) is currently Pending; any other combination is rejected.
- Guest orders can never be cancelled by the guest under any circumstance (no identity to authorize the action).
- Deleting a Product (admin) is a **soft delete** (`is_active = false`) — historical OrderItems reference snapshotted data, not a live Product, so removing/deactivating a product must never break past orders. The product simply stops appearing in browse/search results.
- Order history is immutable and permanent — no order is ever hard-deleted regardless of its final status.
- All quantity/stock changes affecting an order happen atomically with the status change that causes them (decrement with placement; restore with cancel/return) to avoid inconsistent intermediate states.

---

## 9. Open Questions for Clarification

1. **Stock reservation duration for unconfirmed Pending orders:** since stock decrements immediately at placement and there's no auto-expiry in v1, a guest or client order that never gets confirmed/cancelled ties up stock indefinitely. Is this acceptable for v1, or should there eventually be a manual "release stock" admin action for stale Pending orders? (Not required to build now — flagging as a known v1 limitation.)
2. **Guest checkout duplicate-order prevention:** since guests aren't identified, is any lightweight duplicate-submission protection needed (e.g., idempotency on rapid double-clicks), or is that out of scope for v1?
3. **Admin account creation:** is there a seed/bootstrap admin account, or does `/auth/register` support creating an admin (with some gate), or are admins provisioned directly in the database only?
4. **Product deletion when active orders reference it:** confirmed soft-delete approach — did you also want products with zero remaining variants (all deactivated) to auto-deactivate the parent product, or is that a manual admin action?

---

## 10. Technology Stack

Final v1 stack decisions. Everything below is chosen specifically to keep v1 simple to build and cheap to run for a single-region COD marketplace at modest scale (see Section 17 for the concrete load assumption of ~100 concurrent users).

| Layer                 | Technology                               | What it does                                                                      | Why chosen for v1                                                                                                                                                                                                                                              | How it fits in                                                                                                                                                                  |
| --------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend framework    | **Next.js 14+ (App Router, TypeScript)** | Renders client, guest, and admin UIs; handles routing, server components, SSR/SSG | One framework for both frontend and backend (via API routes) means one deployable, one repo, one language end-to-end — minimizes v1 build overhead                                                                                                             | Serves `/`, `/products`, `/cart`, `/orders`, and the entire `/admin/*` dashboard                                                                                                |
| Styling               | **Tailwind CSS**                         | Utility-first CSS                                                                 | Fast to build consistent UI without a separate design system; pairs directly with shadcn/ui                                                                                                                                                                    | Used across all pages and admin components                                                                                                                                      |
| UI components         | **shadcn/ui**                            | Pre-built accessible React components (tables, dialogs, dropdowns, forms)         | Avoids hand-building common admin patterns (data tables, status dropdowns, modals) from scratch                                                                                                                                                                | Powers the admin Orders table, status change dropdown, product/category forms                                                                                                   |
| Client-side data sync | **React Query (TanStack Query)**         | Caches server data in the browser, handles refetching, loading/error states       | Needed regardless of real-time layer — gives a single place to invalidate/refresh order and product data after any mutation or real-time event                                                                                                                 | Wraps every data-fetching hook (`useOrders`, `useProducts`, etc.); is the layer that real-time events ultimately feed into (Section 11)                                         |
| Backend               | **Next.js API Routes (TypeScript)**      | Implements all endpoints in Section 5                                             | No separate backend service to deploy/host — API routes ship with the same Next.js app and the same Vercel deployment                                                                                                                                          | Implements `/api/auth/*`, `/api/admin/*`, `/api/products`, `/api/orders`, etc.                                                                                                  |
| Database              | **PostgreSQL 15+**                       | Relational storage for all entities in Section 2                                  | Strong relational integrity (FKs, unique constraints) fits this domain well — orders/variants/stock require transactional correctness, not a document store                                                                                                    | Single source of truth; every entity in Section 2 is a Postgres table                                                                                                           |
| ORM                   | **Prisma**                               | Type-safe DB access, migrations, query builder                                    | Generates TypeScript types from the schema so API routes get compile-time safety; `prisma migrate` gives a clean, reviewable migration history                                                                                                                 | Used by every API route to read/write; also provides the transaction API used for stock-locking (Section 14)                                                                    |
| Authentication        | **JWT + bcrypt (custom, in API routes)** | Issues signed session tokens on login; hashes/verifies passwords                  | Avoids pulling in a full third-party auth provider for a two-role (admin/client) system — a custom implementation is small enough to own directly and keeps auth logic co-located with the rest of the API                                                     | `bcrypt` hashes `User.password_hash`; JWT is issued at `/auth/login`, verified on every authenticated request, and its payload carries `user_id` + `role` for permission checks |
| Real-time updates     | **Supabase Realtime**                    | Broadcasts database row changes to subscribed clients over WebSockets             | Chosen over standing up a separate Socket.io server: Supabase Realtime listens to Postgres changes directly (via logical replication) with no extra server process to deploy/scale on Vercel's serverless model, which does not hold long-lived processes well | Admin dashboard subscribes to the `Order` table's change stream (see Section 11)                                                                                                |
| Image handling        | **Cloudinary**                           | Hosts and serves product images (upload, storage, CDN delivery)                   | Offloads image storage/optimization so the app database and Vercel deployment never handle binary files directly                                                                                                                                               | `Product.images` store Cloudinary URLs; admin product form uploads directly to Cloudinary                                                                                       |
| Admin charts          | **Recharts**                             | React charting library (bar/line/pie charts)                                      | Lightweight, composable, and sufficient for the fixed set of v1 analytics charts (Section 12) — no need for a heavier BI tool                                                                                                                                  | Renders the charts on the Analytics/Dashboard admin page                                                                                                                        |
| Deployment            | **Vercel**                               | Hosting for the Next.js app (frontend + API routes)                               | Native fit for Next.js (same vendor), zero-config CI/CD from git push, serverless scaling appropriate for v1's traffic level                                                                                                                                   | Hosts the entire app; Postgres and Supabase Realtime are external managed services it connects to                                                                               |

**Note on Supabase vs. plain Socket.io:** either would satisfy the real-time requirement. Supabase Realtime is preferred here because it needs no separately hosted server process (Socket.io would require a persistent Node process, which doesn't fit Vercel's serverless functions cleanly) and it reads directly off Postgres row changes rather than requiring the API layer to manually emit events on every mutation. If the platform later moves off Vercel to a host with long-lived processes, Socket.io remains a valid drop-in alternative — the rest of this document's real-time flow (Section 11) is unaffected by which of the two is used, since both broadcast the same event: "an Order row changed."

---

## 11. Real-Time Order Updates Architecture

**Purpose:** keep the admin's order list and order-detail views instantly up to date across all connected admin sessions whenever any order's status changes — with no page refresh and no notifications sent to clients/guests.

### 11.1 How the admin dashboard subscribes

1. When an admin opens the Orders page, the client establishes a Supabase Realtime subscription (a WebSocket connection) scoped to the `Order` table (optionally filtered, e.g., to recent orders).
2. Supabase Realtime listens to Postgres's write-ahead log (logical replication) for INSERT/UPDATE events on `Order`.
3. Any change to an `Order` row — created via checkout, or `status` updated via `PUT /admin/orders/:id/status` — is broadcast over that WebSocket to every currently-subscribed admin session.
4. Multiple admins logged in simultaneously all receive the same broadcast — there's no polling and no "refresh to see updates."

### 11.2 Data flow

```
DB write (Order.status changes)
        │
        ▼
Postgres logical replication stream
        │
        ▼
Supabase Realtime service (detects row change, matches subscriptions)
        │
        ▼
WebSocket push ──────▶ Admin Browser Tab 1
        │
        └────────────▶ Admin Browser Tab 2 (any other logged-in admin)
```

### 11.3 What is (and isn't) sent

- Only the changed `Order` row's data is broadcast (id, new status, updated_at, etc.) — this is a UI-refresh signal, not a customer notification.
- No email/SMS/push notification is sent to the client or guest who placed the order (explicitly deferred to v2 — see the "Deferred to v2" list).
- The client-facing order pages (`GET /orders/:id`) are not required to be real-time in v1 — a client can simply refetch/reload to see status changes; only the _admin_ dashboard requires live updates, since admin is the one actively managing multiple orders at once.

### 11.4 How React Query handles syncing

- Each incoming Realtime event triggers a call to `queryClient.invalidateQueries(['orders'])` (and `['orders', orderId]` if the detail view is open).
- React Query then refetches the affected query from the API in the background and re-renders the UI with fresh data — this reuses the exact same fetch path the page uses on initial load, so there's no separate "real-time data shape" to maintain.
- This keeps Realtime's job narrow: it only has to say "something changed," not carry the full updated dataset — React Query's normal cache/fetch/render cycle does the rest.

### 11.5 WebSocket connection management

- One WebSocket connection per admin browser tab, opened when the Orders (or dashboard) page mounts and closed when it unmounts/navigates away.
- Supabase's client library handles reconnection automatically on network drop.
- Connections are only opened for authenticated admin sessions — clients and guests never open a Realtime subscription in v1.
- No connection is held by serverless API routes themselves — the subscription is entirely between the admin's browser and the Supabase Realtime service, so it doesn't consume Vercel function time.

---

## 12. Admin Dashboard Structure

| Page                      | Contents                                                                                 | Key interactions                                                                                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Orders**                | Real-time list of all orders (id, customer name/guest name, total, status, created date) | Filter by status, by client, by date range; click a row to open order detail and change status via `PUT /admin/orders/:id/status`; list updates live per Section 11                                               |
| **Clients**               | List of all registered (logged-in) users                                                 | View a client's profile and their full order history; read-only in v1 (no admin-side editing of client accounts)                                                                                                  |
| **Products Management**   | List of all products (name, category, price, active/inactive)                            | Create/edit a product (name, description, price, category, images); within a product, manage its variants — add a variant, edit price/label/stock, enable/disable a variant; view current stock level per variant |
| **Categories Management** | List of all categories                                                                   | Create/edit/delete a category (delete blocked or cascabled per business rule if products still reference it — see Section 8's category rule)                                                                      |
| **Analytics/Dashboard**   | KPI tiles + charts, see 12.1                                                             | Read-only; optional date-range filter for the time-series chart                                                                                                                                                   |

### 12.1 Analytics/Dashboard page detail

**KPI tiles:**

- Total revenue (sum of `total_amount` for Delivered orders)
- Pending orders (count)
- Delivered orders (count)
- Cancelled orders (count, includes Returned or shown as a separate tile — Cancelled and Returned are tracked distinctly since they have different causes)

**Charts (Recharts):**

- Bar/pie chart — orders by status distribution (Pending/Confirmed/Shipped/Delivered/Returned/Cancelled counts)
- Line/bar chart — money flow over time (revenue from Delivered orders, grouped daily/weekly/monthly)
- Simple count chart — total orders delivered over the selected period

This page is explicitly scoped to these fixed charts/KPIs only — no ad-hoc report building, no export, no custom date-range comparison (all deferred beyond v1 if needed).

---

## 13. Database Schema (Entity Relationships, with keys & indexes)

This section restates the entities from Section 2 with explicit primary keys, foreign keys, unique constraints, and the indexes needed to keep admin queries (order list filtering, product search) fast.

| Entity             | Primary Key | Foreign Keys                                                    | Unique Constraints                                                                      | Indexes (performance)                                                                                                                                                                           |
| ------------------ | ----------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**           | `id`        | —                                                               | `email` (unique)                                                                        | `email` (login lookup); `role` (admin filtering users)                                                                                                                                          |
| **Category**       | `id`        | —                                                               | `slug` (unique)                                                                         | `slug` (category page lookup)                                                                                                                                                                   |
| **Product**        | `id`        | `category_id` → Category.id                                     | —                                                                                       | `category_id` (browse-by-category); composite/text index on `name`, `description` for search (Section 1: search by name/description/category); `is_active` (exclude soft-deleted from listings) |
| **ProductVariant** | `id`        | `product_id` → Product.id                                       | (`product_id`, `variant_label`) unique — no duplicate variant labels within one product | `product_id` (fetch all variants for a product page); `is_active`                                                                                                                               |
| **Cart**           | `id`        | `user_id` → User.id (nullable)                                  | —                                                                                       | `user_id` (fetch a logged-in user's cart)                                                                                                                                                       |
| **CartItem**       | `id`        | `cart_id` → Cart.id; `product_variant_id` → ProductVariant.id   | (`cart_id`, `product_variant_id`) unique — one row per variant per cart                 | `cart_id`                                                                                                                                                                                       |
| **Order**          | `id`        | `user_id` → User.id (nullable)                                  | —                                                                                       | `user_id` (client's own order history); `status` (admin filter by status — critical for the Orders dashboard page); `created_at` (date-range filtering, default sort newest-first)              |
| **OrderItem**      | `id`        | `order_id` → Order.id; `product_variant_id` → ProductVariant.id | —                                                                                       | `order_id` (fetch all items for an order); `product_variant_id` (rare, e.g. "which orders included this variant")                                                                               |

**On "OrderItemVariant":** as noted in Section 2.7, v1 does not use a separate `OrderItemVariant` join table. Each `OrderItem` row directly references one `ProductVariant` plus a `quantity` and price/name/label snapshots — this is sufficient because an order line item is always exactly one variant at one price, never a multi-variant composite.

**Composite index callout for admin performance:** the Orders page filters by status, client, and date range simultaneously, so a composite index on `Order(status, created_at)` (and optionally `Order(user_id, status)`) is worth adding once order volume grows — noted here as the first index to add if the Orders page query becomes slow, not required from day one at v1's expected scale.

```
User ───────────< Order >───────────< OrderItem >───────── ProductVariant
 │ (nullable FK)                                                  │
 │                                                                 │
 └──< Cart >──< CartItem >───────────────────────────────────────┘
                                                                    │
Category ──< Product ──< ProductVariant ───────────────────────────┘
```

---

## 14. Inventory Locking Mechanism

**Problem:** two clients (or a client and a guest) could attempt to order the last unit(s) of the same `ProductVariant` at nearly the same moment. Without locking, both requests could read "1 in stock," both decide it's available, and both decrement — driving stock negative.

### 14.1 How Prisma transactions prevent this

- Order placement runs inside a single Prisma transaction (`prisma.$transaction`) that: (1) reads the current `stock_quantity` for every requested variant with a row lock, (2) validates each requested quantity against that locked value, (3) decrements stock and creates the `Order`/`OrderItem` rows, all before the transaction commits.
- The row lock is taken with a `SELECT ... FOR UPDATE`-equivalent query inside the transaction (Prisma supports raw parameterized queries for this, since the query builder API does not expose `FOR UPDATE` directly) — this blocks any other concurrent transaction from reading/modifying the same `ProductVariant` row until the first transaction commits or rolls back.
- Because the lock is held for the duration of the whole check-and-decrement sequence, no second transaction can "sneak in" between the stock check and the stock write.

### 14.2 Example: two clients order the same variant simultaneously

1. `ProductVariant` "Red/Large" has `stock_quantity = 1`.
2. Client A's checkout transaction begins, takes a row lock on that variant, reads `stock_quantity = 1`, confirms 1 is enough for their requested quantity of 1.
3. Client B's checkout transaction begins at nearly the same instant, attempts to read/lock the same row — it **waits**, because Client A's transaction is still holding the lock.
4. Client A's transaction decrements `stock_quantity` to 0, creates their Order, and commits — releasing the lock.
5. Client B's transaction now acquires the lock, reads the _fresh_ `stock_quantity = 0`, and finds it insufficient for their requested quantity — their order is rejected (or that line item fails) before any Order/OrderItem row is written for Client B.
6. Result: exactly one of the two succeeds; stock never goes negative; no oversold unit.

### 14.3 What happens if stock becomes unavailable mid-checkout

- If validation fails inside the transaction (insufficient stock for one or more items), the entire transaction rolls back — no partial Order is created, no stock is touched, consistent with the "all-or-nothing" rule already established for order placement.
- The client/guest sees a clear rejection (e.g., "Red/Large is no longer available in the requested quantity") and must adjust their cart before retrying — there is no partial fulfillment of an order in v1.

---

## 15. API Endpoints — Admin Analytics (additions)

All previous endpoints from Section 5 remain unchanged. The following are added for the Analytics/Dashboard admin page (Section 12.1):

```
GET    /admin/analytics/orders-by-status      (count of orders grouped by status)
GET    /admin/analytics/revenue               (total revenue — sum of total_amount for Delivered orders)
GET    /admin/analytics/revenue-over-time     (revenue grouped daily/weekly/monthly, query param selects granularity)
GET    /admin/analytics/orders-count          (counts: delivered, pending, confirmed, shipped, cancelled, returned)
GET    /admin/dashboard/summary               (combined KPI payload: total revenue, pending count, delivered count, cancelled count — powers the KPI tiles in one call)
```

All analytics endpoints are admin-only and read-only — they compute aggregates over `Order`/`OrderItem` and never mutate data.

---

## 16. Real-Time Updates Flow (worked example)

**Scenario: admin marks an order as "Shipped"**

```
Admin UI                Backend (API route)         Database              Supabase Realtime        Other Admin Sessions
   │  PUT /admin/orders/:id/status  │                    │                        │                        │
   │ ──────────────────────────────▶│                    │                        │                        │
   │                                 │  UPDATE Order SET  │                        │                        │
   │                                 │  status='Shipped' ▶│                        │                        │
   │                                 │◀── success ────────│                        │                        │
   │◀──── 200 OK ────────────────────│                    │  row change detected  ▶│                        │
   │                                 │                    │   (WAL / replication)  │  broadcast event  ────▶│
   │  React Query invalidates        │                    │                        │                        │  React Query invalidates
   │  ['orders'] on this session too │                    │                        │                        │  ['orders'] here too
   │  (from its own mutation's       │                    │                        │                        │
   │   onSuccess) ─── list refetches │                    │                        │                        │  list refetches, re-renders
   │   and re-renders instantly      │                    │                        │                        │  instantly — no page reload
```

Step by step:

1. Admin (Session A) clicks "Mark as Shipped" → frontend calls `PUT /admin/orders/:id/status`.
2. Backend API route updates `Order.status = 'Shipped'` in Postgres (inside the standard status-update logic; no stock change for this transition per Section 3.2).
3. Postgres's row change is picked up by Supabase Realtime via logical replication.
4. Supabase Realtime broadcasts the change to every subscribed admin WebSocket connection — including Session A itself and any other admin (Session B, C, …) currently viewing the Orders page.
5. Each admin dashboard's Realtime listener receives the event and calls `queryClient.invalidateQueries(['orders'])`.
6. React Query refetches the orders list in the background and re-renders — the order's row updates to show "Shipped" instantly, on every connected admin session, with no manual refresh.

---

## 17. Performance Considerations for ~100 Concurrent Users

- **Database connection pooling:** Prisma's connection pool (or an external pooler such as PgBouncer/Supabase's built-in pooler, recommended when deploying to Vercel's serverless functions, since each function invocation can open a new connection) keeps the number of live Postgres connections bounded even under bursts of concurrent requests. At ~100 concurrent users, a modest pool size (e.g., the default or a small fixed pool) is sufficient — no custom tuning expected for v1.
- **Caching:** not needed for v1. Product/category listings and order queries are simple, indexed lookups against Postgres, and at this scale direct queries are fast enough — adding a cache layer (e.g., Redis) now would be premature complexity.
- **Real-time connection limit:** WebSocket connections are only opened by authenticated admin sessions (Section 11.5), not by every client/guest — realistically this is a handful of concurrent connections (however many admins are logged in at once), nowhere near a scaling concern even under Supabase's free/starter tier limits. Client/guest traffic (the bulk of the 100 concurrent users) never opens a Realtime subscription in v1.
- **When to add caching (v2 signal):** if product listing/search queries start showing up as slow under real traffic (monitor via basic query timing), or if the Orders dashboard query becomes expensive as historical order volume grows into the tens of thousands of rows, that's the trigger to introduce either a cache layer or the composite indexes flagged in Section 13 — not before, and not speculatively in v1.

---

## 18. Deployment Checklist

- [ ] **PostgreSQL database provisioned** (v15+), connection string obtained, and reachable from Vercel.
- [ ] **Prisma migrations applied** to the target database (`prisma migrate deploy` in production, not `migrate dev`).
- [ ] **Vercel project created** and linked to the repository; both the Next.js frontend and API routes deploy together as one project.
- [ ] **Cloudinary account configured**, API key/secret/cloud name added as environment variables.
- [ ] **Supabase project configured** for Realtime: Realtime enabled on the `Order` table, connection/anon key obtained for the frontend subscription client.
- [ ] **Environment variables set** in both `.env.local` (local dev) and Vercel's production environment variable settings — at minimum: `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET`, `SUPABASE_URL`/`SUPABASE_ANON_KEY`.
- [ ] **JWT secret** generated as a strong random value, never reused from a dev/example value in production.
- [ ] **Seed/bootstrap admin account** created directly in the database (pending answer to Open Question 3 in Section 9) before go-live, so there is at least one way to log into the admin dashboard.
- [ ] **Verify Realtime subscription works end-to-end** in the deployed environment (not just locally) before relying on it for admin operations — confirm a status change made in one browser session appears live in another.

---

## Deferred to v2 (excluded from this document and from v1 scope)

OTP verification · fuzzy search (pg_trgm) · online payments · guest order tracking · email/SMS notifications · discounts/coupons/promo codes · analytics/dashboards.
