# Client Interface Specification — E-Commerce Platform v1

This is a design document, not an implementation guide. It describes what clients see, how they browse and check out, and the complete journey from landing on the site to a placed order. It complements [architecture.md](architecture.md) (entities, API endpoints, order lifecycle) and [admin-dashboard-spec.md](admin-dashboard-spec.md) (the admin-facing counterpart) — this document covers only the client-facing (guest and logged-in) experience.

---

## 1. Client Interface Overview

**Purpose:** let clients browse products, add items to a cart, and place an order — with or without creating an account.

**User types:**

- **Guest** — no account, no login. Provides name/email/phone directly at checkout.
- **Logged-in user** — has an account, gets auto-filled checkout info and order tracking.

**Key principle:** login is entirely optional. Neither path is a "lesser" experience for placing an order — both a guest and a logged-in user can complete a purchase equally well. The only difference is that a logged-in user can see their order afterward; a guest cannot.

**No real-time notifications for clients:** unlike the admin dashboard (which updates live), the client side does not push updates to the client. If a client wants to see whether their order has been confirmed/shipped, they open **My Orders** and check manually. There is no toast, badge, email, or SMS telling them a status changed in v1.

---

## 2. Navigation Structure

### Guest / unauthenticated header

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]      [ 🔍 Search products...          ]   [Categories ▾]        │
│                                                    [🛒 Cart (2)] [Login] [Register] │
└─────────────────────────────────────────────────────────────────────┘
```

| Element             | Behavior                                                             |
| ------------------- | -------------------------------------------------------------------- |
| Logo/Home           | Returns to home/product listing page                                 |
| Search bar          | Text search across products, live on every page                      |
| Categories dropdown | Lists all categories; clicking one filters products by that category |
| Cart icon           | Badge shows current item count; click opens Cart page                |
| Login button        | Goes to Login page                                                   |
| Register button     | Goes to Register page                                                |

### Logged-in header

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo]      [ 🔍 Search products...          ]   [Categories ▾]        │
│                                        [🛒 Cart (2)] [Jane D. ▾]        │
└─────────────────────────────────────────────────────────────────────┘
                                              ┌────────────────┐
                                              │ Profile          │
                                              │ My Orders        │
                                              │ Logout           │
                                              └────────────────┘
```

Same as guest header, except Login/Register are replaced by an account dropdown ("Jane D.") containing Profile, My Orders, and Logout.

---

## 3. Home Page / Product Listing Page

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Header]                                                              │
├─────────────────────────────────────────────────────────────────────┤
│  Welcome banner: "Shop the latest arrivals — Cash on Delivery"          │
├───────────────┬───────────────────────────────────────────────────┤
│ Categories       │  Products (grid)                                      │
│ ▸ All products    │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│ ▸ Apparel          │  │ [image]   │ │ [image]   │ │ [image]   │              │
│ ▸ Electronics      │  │ Red T-Shirt│ │ Blue Jeans │ │ Wireless Mouse│         │
│ ▸ Home & Kitchen   │  │ Apparel    │ │ Apparel    │ │ Electronics   │        │
│                   │  │ $15.00     │ │ $40.00     │ │ $22.50        │         │
│                   │  │ [Add to Cart]│[Add to Cart]│[Add to Cart]│              │
│                   │  └──────────┘ └──────────┘ └──────────┘              │
│                   │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│                   │  │   ...      │ │   ...      │ │   ...      │              │
│                   │  └──────────┘ └──────────┘ └──────────┘              │
│                   │                                                        │
│                   │       [‹ Prev]  [1] [2] [3]  [Next ›]                  │
└───────────────┴───────────────────────────────────────────────────┘
```

| Section            | Contents                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Hero banner     | Optional welcome/promo message — not required for v1, static text is enough                                                                                                    |
| B. Category filter | Sidebar (or top bar on mobile) listing all categories plus "All products"; clicking a category filters the grid; "All products" resets the filter                              |
| C. Search bar      | In the header, present on every page — see Section 12                                                                                                                          |
| D. Products grid   | Each card shows: image (Cloudinary), name, price, category, optional short description, "Add to Cart" button; clicking anywhere else on the card opens the product detail page |
| E. Pagination      | 12 products per page by default; Prev/Next plus numbered page controls — no infinite scroll in v1                                                                              |

**Example product card data:**

| Product        | Category    | Price  |
| -------------- | ----------- | ------ |
| Red T-Shirt    | Apparel     | $15.00 |
| Blue Jeans     | Apparel     | $40.00 |
| Wireless Mouse | Electronics | $22.50 |

---

## 4. Product Detail Page

```
┌─────────────────────────────────────────────────────────────────────┐
│  Home > Apparel > Red T-Shirt                                          │
├───────────────────────────┬───────────────────────────────────────┤
│                              │  Red T-Shirt                             │
│      [ large product image ] │  Apparel                                 │
│                              │  $15.00                                   │
│                              │  In stock                                 │
│                              │                                            │
│                              │  Size:  ( Small )  (•Medium)  ( Large )   │
│                              │  Medium — 8 left                          │
│                              │                                            │
│                              │  Quantity: [ - ]  2  [ + ]                │
│                              │                                            │
│                              │  [        Add to Cart        ]           │
│                              │                                            │
│                              │  Payment: Cash on Delivery                │
│                              │  You only pay when you receive your order │
├───────────────────────────┴───────────────────────────────────────┤
│  Description                                                            │
│  100% cotton crew-neck T-shirt, machine washable, true to size.          │
└─────────────────────────────────────────────────────────────────────┘
```

| Section                | Contents                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Product information | Large image, name, price, category, full description, overall stock status                                                                                                                                                                                                                              |
| B. Variants            | If the product has variants: a selector (e.g., Size: Small / Medium / Large); the currently selected variant's remaining stock is shown (e.g., "Medium — 8 left"); if a variant has its own price override, that price is shown once selected                                                           |
| C. Add to cart         | Variant selector (if applicable) + quantity selector, capped at the selected variant's available stock; "Add to Cart" button; if the selected variant (or the whole product, if no variants) has 0 stock, the button is replaced with a disabled "Out of Stock" state and no quantity selector is shown |
| D. Additional info     | Payment method note ("Cash on Delivery — pay when you receive your order"); a v1 return/cancellation note can state simply "Orders can be cancelled before they are confirmed" — no formal delivery-time estimate is promised in v1 since there's no logistics integration                              |

**Out-of-stock example:** if "Small" has 0 stock, selecting it shows "Small — Out of stock" and disables Add to Cart until a different, available variant is chosen.

---

## 5. Shopping Cart Page

```
┌─────────────────────────────────────────────────────────────────────┐
│  Your Cart                                                              │
├───────────────┬─────────┬───────┬───────────┬───────────┬──────────┤
│ Product          │ Variant   │ Qty     │ Unit Price   │ Subtotal     │ Remove     │
├───────────────┼─────────┼───────┼───────────┼───────────┼──────────┤
│ Red T-Shirt       │ Medium     │ [–]2[+]   │ $15.00       │ $30.00       │ [🗑]        │
│ Blue Jeans         │ 32          │ [–]1[+]   │ $40.00       │ $40.00       │ [🗑]        │
├───────────────┴─────────┴───────┴───────────┴───────────┴──────────┤
│                                                Subtotal:   $70.00       │
│                                                Shipping:   $0.00        │
│                                                Total:      $70.00       │
│                                                                          │
│  [ Continue Shopping ]                          [ Proceed to Checkout ] │
└─────────────────────────────────────────────────────────────────────┘
```

| Section         | Contents                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| A. Cart items   | Product name, variant label, quantity (with inline +/– editor), unit price, subtotal, remove button     |
| B. Cart summary | Subtotal (sum of item subtotals), shipping cost (fixed at $0.00 for v1 — no shipping-cost logic), total |
| C. Actions      | "Continue Shopping" returns to the product listing; "Proceed to Checkout" moves to checkout             |

**Empty cart state:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Your cart is empty. Start shopping!                 │
│                          [ Browse Products ]                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Checkout Page (Guest vs. Logged-in)

### Path A — Guest checkout

**Step 1: Delivery information**

```
┌───────────────────────────────┐
│ Delivery Information             │
│ Full Name *      [_____________] │
│ Email *          [_____________] │
│ Phone *          [_____________] │
│ Delivery Address * [___________] │
│                    [___________] │
│ Special Instructions (optional)   │
│                    [___________] │
│                       [ Continue ] │
└───────────────────────────────┘
```

**Step 2: Order review** — cart items shown read-only, delivery info shown with an "Edit" link back to Step 1, order total.

**Step 3: Place order**

```
┌───────────────────────────────┐
│ Order Total: $70.00                │
│ [ ] I agree to the terms (if used) │
│        [   Place Order   ]         │
└───────────────────────────────┘
```

After placing:

```
┌───────────────────────────────────────────────────┐
│  ✓ Thank you for your order!                          │
│  Your order ID is #1043.                               │
│  The seller will call you to confirm.                  │
│  No order tracking is available for guest checkouts.   │
│                          [ Continue Shopping ]          │
└───────────────────────────────────────────────────┘
```

No auto-login happens after a guest order — the guest remains unauthenticated, and this order cannot be looked up again by them afterward.

### Path B — Logged-in checkout

**Step 1: Delivery information (pre-filled)**

```
┌───────────────────────────────┐
│ Delivery Information             │
│ Name              [ Jane D.     ] │
│ Email              [ jane@ex.com ]│
│ Phone              [ 555-0101    ]│
│ Delivery Address    [ 123 Main St ]│
│ Special Instructions (optional)   │
│ [ ] Save this address for next time│
│                       [ Continue ] │
└───────────────────────────────┘
```

All fields pre-fill from the client's profile but remain editable for this order. An optional checkbox lets them save a new/edited address back to their profile for future checkouts.

**Step 2: Order review** — same as guest, cart items + delivery info + total.

**Step 3: Place order** — same "Place Order" button. After placing:

```
┌───────────────────────────────────────────────────┐
│  ✓ Thank you for your order!                          │
│  Your order ID is #1044.                               │
│  You can track your order in My Orders.                │
│                          [ View My Orders ]             │
└───────────────────────────────────────────────────┘
```

The client is redirected to the order detail page (Section 8) for #1044.

---

## 7. Order Confirmation Page

```
┌─────────────────────────────────────────────────────────────────────┐
│  ✓ Order placed successfully!                                          │
│  Order #1044 — Jul 12, 2026, 3:14 PM                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Items                                                                   │
│  Red T-Shirt (Medium) × 2       $30.00                                  │
│  Blue Jeans (32) × 1            $40.00                                  │
│                                    Total: $70.00                          │
│  Delivery Address: 123 Main St, ...                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Next steps:                                                             │
│  (guest)   "A seller will call you to confirm the order.                 │
│             No tracking is available for guest orders."                  │
│  (logged-in)"You can track your order status anytime in My Orders."      │
├─────────────────────────────────────────────────────────────────────┤
│  [ Continue Shopping ]              [ View My Orders ]  (logged-in only) │
└─────────────────────────────────────────────────────────────────────┘
```

| Section                 | Contents                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Confirmation message | "Order placed successfully!", order ID, date/time                                                                                                                                                                                                                                                                               |
| B. Order summary        | Items (name, variant, qty, price), delivery address, total                                                                                                                                                                                                                                                                      |
| C. Next steps           | Differs by user type — guest is told there's no tracking; logged-in is told to check My Orders. Note: v1 does not send an email confirmation to guests despite the phrase sometimes used elsewhere — email/SMS confirmations are explicitly deferred to v2 (see Section 19), so this page should not promise "check your email" |
| D. Actions              | "Continue Shopping" always shown; "View My Orders" only for logged-in users                                                                                                                                                                                                                                                     |

---

## 8. My Orders Page (logged-in users only)

### Orders list

```
┌─────────────────────────────────────────────────────────────────────┐
│  My Orders                                          [Status: All ▾]     │
├─────────┬───────────┬──────────────┬───────────┬─────────────────┤
│ Order      │ Date        │ Status         │ Total       │ Action              │
├─────────┼───────────┼──────────────┼───────────┼─────────────────┤
│ #1044      │ Jul 12      │ 🟡 Pending      │ $70.00      │ [View Details]       │
│ #0987      │ Jun 30      │ 🟢 Delivered    │ $22.00      │ [View Details]       │
│ #0850      │ Jun 12      │ 🔴 Cancelled    │ $18.00      │ [View Details]       │
└─────────┴───────────┴──────────────┴───────────┴─────────────────┘
```

Default sort: newest first. Optional filters by status and date range. This list is fetched on page load/manual refresh only — it is **not** live-updating (no Supabase Realtime subscription on the client side, per Section 1's "no real-time notifications" principle); the client must reopen or reload the page to see a status change.

### Order detail

```
┌─────────────────────────────────────────────────────────────────────┐
│  Order #1044                                          [Back to Orders] │
│  Placed: Jul 12, 2026, 3:14 PM                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Status:  ●Pending ──○Confirmed ──○Shipped ──○Delivered                  │
├─────────────────────────────────────────────────────────────────────┤
│  Items                                                                   │
│  Red T-Shirt   Medium   × 2   $15.00   $30.00                            │
│  Blue Jeans     32       × 1   $40.00   $40.00                            │
│                                     Total: $70.00                          │
│  Delivery Address: 123 Main St, ...                                       │
├─────────────────────────────────────────────────────────────────────┤
│  [ Cancel Order ]   (only shown while status = Pending)                   │
└─────────────────────────────────────────────────────────────────────┘
```

| Element             | Detail                                                                                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status timeline     | Filled dot = reached, hollow = not yet reached, matching the same visual language as the admin's order detail view. If the order is Cancelled or Returned, the timeline instead shows that terminal state in place of the forward path (e.g., a red "Cancelled" marker) |
| Items               | Product name, variant, quantity, unit price, subtotal per line, order total                                                                                                                                                                                             |
| Cancel Order button | Only rendered when `status === Pending` — absent entirely for any other status, so there is no way to attempt cancelling a Confirmed+ order from the UI                                                                                                                 |

**Cancel confirmation:**

```
┌───────────────────────────────────────┐
│  Cancel this order?                       │
│  Stock will be restored immediately.       │
│  You can place a new order anytime.        │
│           [ Go Back ]  [ Yes, Cancel Order ]│
└───────────────────────────────────────┘
```

On confirm: order status becomes Cancelled, stock is restored, and the order remains permanently visible in My Orders marked as Cancelled (never removed from history).

---

## 9. User Authentication Pages

### Page A — Login

```
┌───────────────────────────────┐
│  Log In                            │
│  Email *      [_______________]   │
│  Password *   [_______________]   │
│                       [ Log In ]   │
│  Don't have an account? Register    │
└───────────────────────────────┘
```

No "Forgot password?" link in v1 — password reset is deferred to v2 (no email delivery mechanism exists in v1 to support it).

### Page B — Register

```
┌───────────────────────────────┐
│  Create Account                    │
│  Name *              [___________] │
│  Email *              [___________]│
│  Phone *               [___________]│
│  Password *            [___________]│
│  Confirm Password *    [___________]│
│                         [ Register ]│
│  Already have an account? Log in     │
└───────────────────────────────┘
```

Phone is required (not optional) — it's needed for the COD confirmation call regardless of whether checkout is guest or logged-in, so collecting it consistently at registration keeps the profile complete for auto-fill at checkout. After successful registration: auto-login and redirect to the home page.

### Page C — Account Profile (logged-in)

```
┌───────────────────────────────┐
│  My Profile                        │
│  Name           [ Jane D.       ]  │
│  Email          [ jane@ex.com   ]  │
│  Phone          [ 555-0101      ]  │
│  Member since:  Jan 3, 2026 (read-only) │
│                        [ Save ]    │
│  [ Change Password ]                │
│  [ Log Out ]                        │
└───────────────────────────────┘
```

Name/email/phone are editable inline with a Save button; "Created date" is read-only. A "Change Password" option is available (basic current-password + new-password form); no password-reset-via-email flow in v1, only in-session password change.

---

## 10. Cart Persistence

|                          | Guest cart                                        | Logged-in cart                                                                                                                       |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Storage                  | Browser `localStorage`                            | Server-side (Cart/CartItem tables) — or localStorage, either is acceptable for v1                                                    |
| Persists across sessions | Yes, same browser                                 | Yes, across devices/browsers since it's tied to the account                                                                          |
| Cross-tab sync           | Not required for v1                               | Real-time cross-tab cart sync is optional, not required — a page reload is an acceptable way to see cart changes made in another tab |
| Cleared                  | After successful checkout, or manual "clear cart" | Same — cleared after checkout                                                                                                        |

If a guest logs in (or registers) while they have an active local cart, merging that local cart into their new account cart is a reasonable v1 behavior, but not a hard requirement — the simplest acceptable v1 behavior is that the guest cart simply continues to be used as their cart once logged in.

---

## 11. Order Cancellation Flow

|                          | Guest order                                           | Logged-in order                                                         |
| ------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Can cancel?              | No — no login, no way to identify/authorize the order | Yes, but only while status is Pending                                   |
| How                      | n/a                                                   | "Cancel Order" button on the order detail page (Section 8)              |
| Confirmation             | n/a                                                   | "Cancel this order? Stock will be restored."                            |
| Result                   | n/a                                                   | Status → Cancelled, stock restored instantly, order remains in history  |
| Can reorder immediately? | n/a (guest never had a trackable order to begin with) | Yes — a new order/checkout is entirely independent of the cancelled one |

---

## 12. Search Functionality

- A search bar is present in the header on every page (Section 2).
- Search matches against: product name, product description (partial/substring match), and category name.
- **Search behavior for v1:** a basic case-insensitive `LIKE`-style substring match — no fuzzy/typo-tolerant search (that's explicitly deferred to v2 via `pg_trgm`, per architecture.md's deferred list). Basic live suggestions-as-you-type are a nice-to-have, not required.

**Search results page:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Results for: "blue"                                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐                                          │
│  │ Blue Jeans │  │ Blue Mug   │                                          │
│  │ $40.00     │  │ $8.00      │                                          │
│  └──────────┘  └──────────┘                                          │
└─────────────────────────────────────────────────────────────────────┘
```

If nothing matches: **"No products match your search."**

---

## 13. Category Browsing

```
┌─────────────────────────────────────────────────────────────────────┐
│  Home > Shoes                                                           │
│  Shoes                                                                   │
│  12 products in this category                                           │
├─────────────────────────────────────────────────────────────────────┤
│  [ 🔍 Search within Shoes... ]                                          │
├─────────────────────────────────────────────────────────────────────┤
│  (product grid filtered to Shoes)                                       │
└─────────────────────────────────────────────────────────────────────┘
```

- Clicking a category in the header dropdown filters the product grid to that category.
- Page title shows the category name; a count line shows how many products are in it.
- A breadcrumb ("Home > Shoes") shows the current location.
- The search bar remains active and can be used to search _within_ the currently selected category (search + category filter combine).

If empty: **"No products in this category yet."**

---

## 14. Error Handling & Validation

### Form validation

- Email fields validate basic email format before submission.
- Phone fields validate a plausible phone format (digits, optional country code/dashes) — not carrier-verified, just format-checked.
- Required fields are marked with an asterisk `*`.
- Validation errors appear inline directly under the offending field.
- The submit button (Register, Login, Place Order, etc.) stays disabled until the form's required fields are valid.

### Error messages

| Scenario                         | Message shown                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Email already registered         | "Email is already registered."                                                                                     |
| Login failure                    | "Invalid email or password." (deliberately generic — does not reveal whether the email exists, for basic security) |
| Adding an out-of-stock item      | "This product is out of stock."                                                                                    |
| Requested quantity exceeds stock | "Quantity exceeds available stock."                                                                                |
| Network failure                  | "Connection error. Please try again."                                                                              |
| Order placement server error     | "Order failed to place. Please try again."                                                                         |

---

## 15. Empty States & Messaging

| Context                | Message                               |
| ---------------------- | ------------------------------------- |
| Search with no results | "No products match your search."      |
| Empty cart             | "Your cart is empty. Start shopping!" |
| No order history       | "You haven't placed any orders yet."  |
| Empty category         | "No products in this category yet."   |

---

## 16. Payment Method Display

Since v1 supports Cash on Delivery only, payment is shown as a fixed, non-editable fact throughout checkout — never a payment method _choice_:

- Checkout review step shows: **"Payment Method: Cash on Delivery"** (no selection UI, just a statement).
- Reassurance copy near the Place Order button: **"You only pay when you receive your order."**
- The order confirmation page repeats this for clarity, especially for first-time guest buyers who might otherwise expect an online payment step.

---

## 17. Responsive Design

| Breakpoint              | Behavior                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile** (< 768px)    | Header collapses to a hamburger menu; single-column layout throughout; form inputs stack vertically; buttons sized at minimum 44px touch targets; product grid becomes a single column |
| **Tablet** (768–1024px) | Category sidebar may collapse to a top filter bar or stay as an optional sidebar; product grid shows 2 columns                                                                         |
| **Desktop** (> 1024px)  | Full category sidebar always visible; product grid shows 3–4 columns; forms use a wider, more spacious layout                                                                          |

---

## 18. Performance Considerations

- Product images are lazy-loaded as the grid/detail page scrolls into view, rather than all loading up front.
- Pagination (12 per page, per Section 3) is used instead of infinite scroll for v1 — simpler to implement and reason about, and avoids unbounded DOM growth on long browsing sessions.
- The cart makes no server calls while items are being added/edited (whether guest localStorage or logged-in) — it only touches the server once, at checkout, when the Order/OrderItem rows are actually created.
- Search does not need to be instantaneous/real-time — a basic request-per-keystroke-pause (debounced) or submit-to-search model is entirely sufficient for v1's scale and search complexity (Section 12).

---

## 19. Future Enhancements (v2 and beyond)

Explicitly out of scope for v1:

- Wishlist / save for later
- Product reviews & ratings
- "Similar products" recommendations
- Live order tracking with real-time delivery updates on the client side
- Email/SMS notifications when order status changes
- Password reset via email
- Address book (multiple saved addresses per account)
- Gift cards
- Coupon/discount/promo codes
- Fuzzy/typo-tolerant search (pg_trgm)

---

## 20. User Journeys

### Journey A — Guest checkout

1. Browse the home page product grid.
2. Filter by category ("Apparel") or search ("blue shirt").
3. Click a product ("Blue Jeans") → view its detail page.
4. Select variant ("32"), select quantity (1) → Add to Cart.
5. Open the cart, review items and total ($40.00).
6. Click "Proceed to Checkout."
7. Enter name, email, phone, delivery address (guest form).
8. Review the order (items, delivery info, total).
9. Click "Place Order."
10. See confirmation: "Order #1043 placed. No tracking available as guest."
11. The seller (admin) later calls the guest's phone number to confirm the order manually.

### Journey B — Registered user checkout

1. Log in.
2. Browse products, add "Red T-Shirt" (Medium, qty 2) to cart.
3. Open cart, review items ($30.00 total).
4. Click "Proceed to Checkout."
5. Delivery info is pre-filled from profile (editable).
6. Review the order.
7. Click "Place Order."
8. See confirmation: "Order #1044 placed. Track it in My Orders."
9. Redirected to the order detail page for #1044.
10. Later returns to My Orders anytime to check status manually (Pending → Confirmed → Shipped → Delivered, one manual check at a time — no push updates).
11. Can cancel the order only while it's still Pending.

### Journey C — Cancel a Pending order

1. Go to My Orders.
2. Click order #1044 (status: Pending).
3. Click "Cancel Order."
4. Confirm in the dialog: "Cancel this order? Stock will be restored."
5. Order status changes to Cancelled; stock for both line items is restored instantly.
6. Order remains visible in My Orders, permanently marked as Cancelled.
7. Client can immediately place a brand-new order for the same items if they want to.

---

## Cross-references

- Entities, order lifecycle, business rules, API endpoints: [architecture.md](architecture.md), Sections 2–8
- Guest vs. logged-in checkout data model (`Order.user_id` nullable, guest_name/email/phone fields): [architecture.md](architecture.md), Section 2.6
- Why clients don't get real-time updates (only the admin dashboard subscribes to Supabase Realtime): [architecture.md](architecture.md), Section 11
- Admin-side counterpart to this document: [admin-dashboard-spec.md](admin-dashboard-spec.md)
