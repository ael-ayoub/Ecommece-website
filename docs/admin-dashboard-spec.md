# Admin Dashboard Specification — E-Commerce Platform v1

## Product inventory workflow

Product creation requires Simple or Configurable selection. Simple Products
collect one SKU and stock quantity and atomically create a hidden default SKU.
Configurable Products collect ordered option names/values and generate SKU
combinations. SKU codes are uppercase, globally unique, at most 64 characters,
and limited to letters, numbers, hyphens, and underscores.

The Product list displays type, SKU count, derived active-SKU stock, price
range, availability, and active status. Product type cannot be changed through
normal editing. Historical SKUs are disabled rather than deleted.

This is a design document, not an implementation guide. It describes what the admin sees, what data is on screen, how the admin interacts with it, and how real-time updates behave. It complements [architecture.md](architecture.md), which covers the underlying entities, API endpoints, and tech stack — this document focuses purely on the admin-facing experience.

---

## 1. Admin Dashboard Overview

**Purpose:** a single interface where the marketplace owner manages products, categories, orders, and clients — with order information kept live, so the admin never has to manually refresh to see the current state of the business.

**Key principle:** order-related updates (new orders, status changes, client-initiated cancellations) appear on screen instantly, without a page refresh and without a notification popup — the relevant table row or badge simply updates in place. This is a live-data experience, not an alert system.

**Target user:** a single admin account — the marketplace owner. v1 does not support multiple admin accounts with different permission levels; anyone logged in as `role = admin` has full access to every page in this document.

---

## 2. Navigation Structure

A persistent left sidebar, present on every admin page.

```
┌───────────────────┐
│  [Logo/Platform]   │
├───────────────────┤
│ ▸ Dashboard         │
│ ▸ Orders            │
│ ▸ Products           │
│ ▸ Categories         │
│ ▸ Clients            │
├───────────────────┤
│ ▸ Account            │
│ ▸ Log out            │
└───────────────────┘
```

| Menu item  | Goes to                      | Purpose                                                       |
| ---------- | ---------------------------- | ------------------------------------------------------------- |
| Dashboard  | Analytics overview           | KPIs, charts, recent activity                                 |
| Orders     | Order management             | Live order list, filters, order detail/status changes         |
| Products   | Product & variant management | Create/edit products, manage variants and stock               |
| Categories | Category management          | Create/edit/delete categories                                 |
| Clients    | User management              | List of registered clients, profile + order history           |
| Account    | Admin's own profile          | Change password/contact info (minimal — not a major v1 focus) |
| Log out    | —                            | Ends session                                                  |

The currently active page is highlighted in the sidebar. No sub-menus are needed for v1 — each item is a single flat page.

---

## 3. Dashboard / Analytics Page

Landing page after login. Purely read-only — no editing happens here.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                                        │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│ Total Revenue│ Delivered    │ Pending      │ Cancelled            │
│ $12,480.00   │ 214          │ 8            │ 15                    │
└─────────────┴─────────────┴─────────────┴─────────────────────┘
┌───────────────────────────────┬───────────────────────────────┐
│  Revenue Over Time              │  Orders by Status               │
│  [Daily] [Weekly] [Monthly]     │  (Bar chart)                     │
│  ╭───── line chart ─────╮       │  Pending   ███                   │
│  │                       │       │  Confirmed ██                    │
│  ╰───────────────────────╯       │  Shipped   █                     │
│                                   │  Delivered ██████████            │
│                                   │  Returned  █                     │
│                                   │  Cancelled ██                    │
├───────────────────────────────┴───────────────────────────────┤
│  Order Status Distribution (Pie)   │  Top-Selling Products (opt.)    │
│      ◕ Delivered 68%                │  1. Red T-Shirt (M)  — 42 sold  │
│      ◔ Pending 12%                  │  2. Blue Jeans (32)  — 30 sold  │
│      ◑ other 20%                    │  3. ...                          │
├─────────────────────────────────────────────────────────────────┤
│  Recent Activity — Last 10 Orders                                   │
│  #1042  Jane D.     Pending    $45.00   just now      ← new, live   │
│  #1041  Guest        Confirmed  $22.00   3 min ago                   │
│  #1040  Ali K.       Delivered  $89.00   1 hr ago                    │
│  ...                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Section A — KPIs

| KPI                    | Definition                                        |
| ---------------------- | ------------------------------------------------- |
| Total Revenue          | Sum of `total_amount` across all Delivered orders |
| Total Orders Delivered | Count of orders currently in Delivered status     |
| Pending Orders         | Count of orders currently in Pending status       |
| Cancelled Orders       | Count of orders currently in Cancelled status     |

Each KPI is a single large number tile with a short label underneath. No comparison arrows/percent-change indicators in v1 (no "up 5% vs last week") — just the current count/sum.

### Section B — Charts

| Chart                | Type                                 | Shows                                                                              |
| -------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| Revenue Over Time    | Line chart                           | Revenue from Delivered orders, with a toggle for Daily / Weekly / Monthly grouping |
| Orders by Status     | Bar chart                            | Count of orders in each of the six statuses, side by side                          |
| Order Distribution   | Pie chart                            | Same six statuses, as a proportion of all orders                                   |
| Top-Selling Products | Simple ranked list (optional for v1) | Product/variant names ranked by units sold                                         |

### Section C — Recent Activity

- A compact table of the 10 most recent orders (ID, client name or "Guest", status badge, total, relative time).
- **Real-time behavior:** when a new order is placed anywhere on the storefront, it appears at the top of this list instantly, pushing the list down (oldest of the 10 drops off). No popup, no sound — the list simply updates.

---

## 4. Orders Page

The core working page for day-to-day admin activity.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Orders                                                            │
│  [Status: All ▾] [Client search: ______] [Date: __ to __] [Sort ▾]│
├───────┬────────────────┬───────────┬───────────┬────────┬───────┤
│ Order  │ Client          │ Status     │ Date       │ Total   │ Action │
├───────┼────────────────┼───────────┼───────────┼────────┼───────┤
│ #1042  │ Jane D. 555-0101│ 🟡 Pending  │ Jul 12    │ $45.00  │ [View] │
│ #1041  │ Guest           │ 🔵 Confirmed│ Jul 12    │ $22.00  │ [View] │
│ #1040  │ Ali K.          │ 🟣 Shipped  │ Jul 11    │ $89.00  │ [View] │
│ #1039  │ Sara M.         │ 🟢 Delivered│ Jul 10    │ $31.00  │ [View] │
│ #1038  │ Guest           │ 🔴 Cancelled│ Jul 10    │ $15.00  │ [View] │
│ #1037  │ Omar T.         │ 🟠 Returned │ Jul 09    │ $60.00  │ [View] │
└───────┴────────────────┴───────────┴───────────┴────────┴───────┘
```

### Table columns

| Column              | Notes                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Order ID            | Clickable — opens order detail                                                                      |
| Client name / phone | Shows registered client's name + phone, or "Guest" + the guest's name/phone if provided at checkout |
| Order status        | Color-coded badge (see Section 9)                                                                   |
| Order date          | Date order was placed                                                                               |
| Total price         | Order total                                                                                         |
| Action              | "View" button — opens order detail                                                                  |

### Filters

| Filter      | Type                  | Behavior                                                                     |
| ----------- | --------------------- | ---------------------------------------------------------------------------- |
| Status      | Multi-select dropdown | Select one or more statuses; table shows orders matching any selected status |
| Client name | Text search           | Matches against client name (registered) or guest name                       |
| Date range  | From/To date pickers  | Restricts to orders placed within the range                                  |

### Sorting

- By date (default: newest first)
- By status
- By price (high-to-low or low-to-high)

### Real-time updates on this page

- If the admin (or the same admin in another tab) changes a status, the row updates in place — badge color and text change instantly.
- If a client cancels their own Pending order from the storefront while the admin is looking at this list, that row's status flips to Cancelled instantly, with no admin action and no popup.
- If a brand-new order is placed while this page is open, it appears at the top of the list (or in its correct sorted position) instantly, without a refresh.
- None of the above trigger a sound, toast, or modal — the table is simply always current.

### Order Detail (modal or dedicated page)

```
┌─────────────────────────────────────────────────────────────────┐
│  Order #1042                                             [Close] │
├─────────────────────────────────────────────────────────────────┤
│  Client: Jane D.   Phone: 555-0101   Placed: Jul 12, 10:32 AM      │
│  Shipping Address: 123 Main St, ...                                │
├─────────────────────────────────────────────────────────────────┤
│  Items                                                              │
│  Product          Variant      Qty   Unit Price   Subtotal          │
│  Red T-Shirt       M            2     $15.00        $30.00          │
│  Blue Jeans        32           1     $15.00        $15.00          │
│                                            Total:    $45.00          │
├─────────────────────────────────────────────────────────────────┤
│  Status Timeline                                                    │
│  ● Pending ──○ Confirmed ──○ Shipped ──○ Delivered                  │
│  (filled = reached, hollow = not yet reached)                        │
├─────────────────────────────────────────────────────────────────┤
│  [ Call to Confirm ]  [ Mark Confirmed ]                             │
│  [ Mark Shipped ]     [ Mark Delivered ]                             │
│                                                                       │
│  [ Cancel Order ]              [ Mark Returned ]      (danger, red)  │
└─────────────────────────────────────────────────────────────────┘
```

| Element                      | Detail                                                                                                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header info                  | Order ID, placed date/time, client name + phone (or guest info), shipping address                                                                                                                                                            |
| Items table                  | One row per OrderItem — product name, variant label, quantity, unit price, line subtotal — plus an order total                                                                                                                               |
| Status timeline              | Visual progress bar through Pending → Confirmed → Shipped → Delivered; if the order is Cancelled or Returned, the timeline instead shows that terminal state clearly (e.g., a red "Cancelled" marker replacing the forward path)             |
| Forward-action buttons       | Only the button(s) valid from the _current_ status are enabled — e.g., a Pending order shows "Mark Confirmed" enabled and "Mark Shipped"/"Mark Delivered" disabled/hidden, since transitions must follow Section 3.2 of the architecture doc |
| "Call to Confirm"            | A soft-action helper button — reminds the admin this order needs a phone confirmation call before marking Confirmed (COD workflow); does not itself change any data, just a UI cue/checklist item                                            |
| Cancel Order / Mark Returned | Danger-styled actions, available depending on current status (Cancel while non-terminal, Returned typically from Shipped/Delivered) — both trigger a confirmation dialog (Section 9) before executing, since both restore stock              |

---

## 5. Products Page

### Section A — Products List

```
┌─────────────────────────────────────────────────────────────────┐
│  Products                                    [+ Create Product]   │
├───────────────┬───────────┬────────┬───────────┬────────┬─────┤
│ Name            │ Category    │ Price   │ Variants   │ Status  │ Action│
├───────────────┼───────────┼────────┼───────────┼────────┼─────┤
│ Red T-Shirt      │ Apparel     │ $15.00  │ 3 variants  │ Active  │ [Edit][Manage Variants][Delete] │
│ Blue Jeans        │ Apparel     │ $40.00  │ 2 variants  │ Active  │ [Edit][Manage Variants][Delete] │
│ Old Item          │ Misc        │ $9.00   │ 1 variant   │ Inactive│ [Edit][Manage Variants][Delete] │
└───────────────┴───────────┴────────┴───────────┴────────┴─────┘
```

| Column         | Notes                                                                              |
| -------------- | ---------------------------------------------------------------------------------- |
| Product name   | —                                                                                  |
| Category       | Single category the product belongs to                                             |
| Price          | Base price (variants may override individually)                                    |
| Variants count | e.g., "3 variants" — clicking "Manage Variants" opens the variant list             |
| Status         | Active / Inactive badge (soft-deleted or manually disabled products show Inactive) |
| Action         | Edit, Manage Variants, Delete buttons                                              |

"Create New Product" opens the same form as Edit, blank.

### Edit Product form

```
┌───────────────────────────────┐
│ Edit Product                    │
├───────────────────────────────┤
│ Name *        [______________]  │
│ Description   [______________]  │
│               [______________]  │
│ Price *       [______________]  │
│ Category *    [ Apparel     ▾]  │
│ Images        [Upload]           │
│                                   │
│         [Cancel]  [Save]         │
└───────────────────────────────┘
```

Fields: Name (required), Description, Price (required), Category (required dropdown, single-select), Images (upload, via Cloudinary per architecture doc). Save persists changes; Cancel discards.

### Manage Variants

```
┌───────────────────────────────────────────────┐
│ Variants — Red T-Shirt                [+ Add Variant]│
├───────────────┬─────────┬───────────┬───────────┤
│ Variant         │ Stock    │ Enabled     │ Action      │
├───────────────┼─────────┼───────────┼───────────┤
│ Red / Small      │ 12       │ [x] On       │ [Edit]       │
│ Red / Medium     │ 0        │ [x] On       │ [Edit]       │
│ Red / Large      │ 5        │ [ ] Off      │ [Edit]       │
└───────────────┴─────────┴───────────┴───────────┘
```

- Each row shows the variant label, current stock quantity, and an Enable/Disable toggle.
- "Edit" on a variant opens a small inline/modal form to change its label, price override, and stock quantity.
- **Variant deletion:** v1 does not support hard-deleting a variant once it may have been ordered (would break historical OrderItem display integrity per the architecture doc's snapshot design) — a variant is only ever **disabled**, not deleted. A variant that has never been part of any order could reasonably allow deletion, but the default and simplest v1 behavior is disable-only, avoiding any conditional logic on whether it's "safe" to delete.
- A stock quantity of 0 is shown plainly (e.g., "0" or "Out of stock") rather than hidden.

---

## 6. Categories Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Categories                                  [+ Create Category]  │
├───────────────────────┬───────────────────┬───────────────────┤
│ Name                    │ Products in category│ Action              │
├───────────────────────┼───────────────────┼───────────────────┤
│ Apparel                  │ 24                    │ [Edit] [Delete]      │
│ Electronics               │ 9                     │ [Edit] [Delete]      │
│ Home & Kitchen            │ 15                    │ [Edit] [Delete]      │
└───────────────────────┴───────────────────┴───────────────────┘
```

- "Create New Category" opens a minimal form: Category name (input), Save button.
- Edit reuses the same form, pre-filled.
- Delete is blocked (or requires reassignment) if the category still has products in it — since a Product must always belong to exactly one Category (architecture doc, Section 8), deleting a category with products would violate that rule. The delete confirmation should surface this: "This category has 24 products — reassign or remove them before deleting" if products exist, otherwise a normal "Are you sure?" confirmation.

---

## 7. Clients Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Clients                                                            │
├───────────────┬──────────────────┬───────────┬────────┬────────┬───────┤
│ Name             │ Email               │ Phone       │ Orders  │ Last Order │ Action │
├───────────────┼──────────────────┼───────────┼────────┼────────┼───────┤
│ Jane D.           │ jane@example.com     │ 555-0101     │ 6        │ Jul 12      │ [View]  │
│ Ali K.             │ ali@example.com      │ 555-0192     │ 2        │ Jul 11      │ [View]  │
│ Sara M.            │ sara@example.com     │ 555-0155     │ 11       │ Jul 10      │ [View]  │
└───────────────┴──────────────────┴───────────┴────────┴────────┴───────┘
```

Note: this list shows registered (logged-in) clients only — guest checkouts have no account and therefore never appear here (consistent with the architecture doc's guest-has-no-tracking rule). Guest orders remain visible only via the Orders page.

### Client Profile (on clicking a client)

```
┌─────────────────────────────────────────────────────────────────┐
│  Jane D.                                              [Close]     │
│  Email: jane@example.com   Phone: 555-0101   Joined: Jan 3, 2026    │
├─────────────────────────────────────────────────────────────────┤
│  Order History                                                     │
│  #1042  Pending    $45.00   Jul 12   [View]                        │
│  #0987  Delivered  $22.00   Jun 30   [View]                        │
│  #0850  Cancelled  $18.00   Jun 12   [View]                        │
│  ...                                                                │
└─────────────────────────────────────────────────────────────────┘
```

Clicking "View" on any order in this list opens the same Order Detail view described in Section 4 — there's a single order-detail component reused everywhere an order can be opened from (Orders page, Dashboard recent activity, Client profile).

---

## 8. Real-Time Updates Behavior

The same underlying mechanism (Supabase Realtime → React Query cache invalidation, per architecture.md Section 11) drives all three scenarios below. In every case: **no page refresh, no notification sound/popup — just the relevant UI element updating itself.**

### Scenario 1 — Admin marks an order "Shipped"

1. Admin opens Order #1040, clicks "Mark Shipped."
2. Database updates `Order.status = 'Shipped'`.
3. The Orders list (if open in this tab or any other admin tab/browser) updates that row's badge from Confirmed to Shipped instantly.
4. The order detail view's status timeline also updates its filled/hollow markers accordingly.

### Scenario 2 — Client cancels their own Pending order

1. Admin is sitting on the Orders page, order #1042 shows Pending.
2. On the storefront (separately), the client who placed #1042 clicks "Cancel Order" — this is entirely their own action, not triggered by the admin.
3. The instant the database updates `Order.status = 'Cancelled'`, the admin's Orders page — with zero action from the admin — updates row #1042's badge to Cancelled.
4. If the admin has the order detail modal for #1042 open at that exact moment, its action buttons update too (forward-action buttons become disabled, since Cancelled is terminal).

### Scenario 3 — New order placed

1. Admin is viewing the Orders list or Dashboard.
2. A client or guest completes checkout anywhere on the storefront.
3. The new order appears at the top of the Orders table (and in Dashboard's Recent Activity) instantly — silently, with no toast/sound, exactly as if the admin had just refreshed, except they didn't have to.

---

## 9. UI/UX Details

### Status badge colors

| Status    | Color  |
| --------- | ------ |
| Pending   | Yellow |
| Confirmed | Blue   |
| Shipped   | Purple |
| Delivered | Green  |
| Cancelled | Red    |
| Returned  | Orange |

Colors are used consistently everywhere a status appears: Orders table, order detail timeline, Dashboard charts, Client profile order history.

### Forms

- Every required field is marked (e.g., an asterisk `*` next to the label).
- Validation errors show inline, directly beneath the offending field (e.g., "Price must be greater than 0"), not as a separate error summary block.
- On successful save, a small success confirmation appears (e.g., "Order updated successfully," "Product saved," "Category created") — a lightweight toast/banner, auto-dismissing, not a blocking modal.

### Modals / Confirmation dialogs

- **Delete confirmation** (category, or a product if ever hard-deletable): "Are you sure you want to delete [name]? This cannot be undone."
- **Mark Returned confirmation:** explicitly states the inventory impact before committing — "Marking this order as Returned will restore 3 units to stock across 2 items. Continue?" — since this is a state change with a side effect the admin should consciously confirm.
- **Cancel Order confirmation:** similarly states stock will be restored.
- Both confirm/cancel buttons are clearly labeled (not just "OK"/"Cancel") — e.g., "Yes, Mark Returned" / "Go Back."

### Loading states

- Tables/charts show a loading spinner (or skeleton rows) while their initial data fetches.
- Any button that triggers a save/mutation (Save, Mark Shipped, Delete, etc.) disables itself and shows an inline spinner for the duration of the request, to prevent duplicate submissions.

### Empty states

- Orders page with no results matching filters: "No orders found. Try adjusting your filters."
- Products/Categories/Clients pages when genuinely empty: a short message plus (where relevant) a prompt to create the first one — e.g., "No categories yet. Create your first category to get started."

---

## 10. Performance & Real-Time Considerations

- A single WebSocket (Supabase Realtime) connection is opened when the admin loads any page that displays live order data (Dashboard, Orders), and closed when they navigate away or log out — consistent with architecture.md Section 11.5.
- **Disconnect handling:** if the Realtime connection drops (e.g., brief network blip), the UI shows a small unobtrusive indicator — e.g., a "Reconnecting…" label near the page header — rather than failing silently or blocking the page; the underlying client library handles automatic reconnection, and once reconnected the indicator disappears and live updates resume.
- **Update latency target:** changes should be reflected in the admin UI within roughly 1–2 seconds of the underlying database write — this is a target for perceived responsiveness, not a hard SLA.
- No polling is used to keep data fresh, and no manual page refresh is ever required to see current order state — this is the core promise of the real-time architecture.

---

## 11. Mobile Responsiveness

Admin usage is expected to be primarily desktop (managing a marketplace), but the dashboard should remain usable on a phone/tablet for occasional on-the-go checks:

- The sidebar (Section 2) collapses into a hamburger menu icon on small screens, expanding as an overlay when tapped.
- Tables (Orders, Products, Categories, Clients) switch to a stacked card layout on narrow viewports — each row becomes a card showing the same fields vertically, since a wide multi-column table doesn't fit a phone screen.
- Buttons and toggles (status actions, variant enable/disable switches) use touch-friendly sizing (larger tap targets) rather than small desktop-oriented click targets.
- Charts on the Dashboard scale down to fit narrower widths, stacking vertically instead of side-by-side.

---

## 12. Future Enhancements (v2 and beyond)

Explicitly out of scope for v1, listed here only to distinguish "not yet" from "never":

- Email/SMS notifications when an order's status changes (to client or admin)
- Bulk actions on the Orders page (e.g., select multiple Pending orders → mark all Confirmed at once)
- Order export (CSV/PDF) for accounting or record-keeping
- Deeper customer analytics (repeat-purchase rate, lifetime value, cohort views)
- Low-stock inventory alerts/warnings (e.g., a banner or badge when a variant drops below a threshold)
- Multiple admin accounts with distinct permission levels

---

## Cross-references

- Underlying entities, API endpoints, and order lifecycle rules: [architecture.md](architecture.md), Sections 2–5
- Technology choices behind the real-time behavior described here (Supabase Realtime, React Query): [architecture.md](architecture.md), Sections 10–11
- Inventory locking guarantees referenced by the "Mark Returned" stock-restoration confirmation: [architecture.md](architecture.md), Section 14
