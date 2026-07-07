# 6. Users, Roles & Permissions

## 6.1 Roles

| Role | Who | Access |
|---|---|---|
| **Guest** | Anyone without an account | Browse, search, add to cart, guest checkout |
| **Customer** | Registered, logged-in shopper | Everything a guest can do, plus order history, saved addresses, faster checkout |
| **Staff** | Store employee | Manage products, categories, and orders. No access to user/role management |
| **Admin** | Store owner / super user | Everything Staff can do, plus manage users, roles, and view full dashboard/analytics |

Roles are stored in a `roles` table and referenced by `users.role_id` (see [05-database-schema.md](./05-database-schema.md)). A user has exactly one role.

## 6.2 Permission matrix

| Action | Guest | Customer | Staff | Admin |
|---|:---:|:---:|:---:|:---:|
| Browse products/categories | ✅ | ✅ | ✅ | ✅ |
| Search & filter | ✅ | ✅ | ✅ | ✅ |
| Add to cart / guest checkout | ✅ | ✅ | ✅ | ✅ |
| View own order history | ❌ | ✅ | ✅ | ✅ |
| Save addresses / reorder | ❌ | ✅ | ✅ | ✅ |
| Write product review | ❌ | ✅ | ✅ | ✅ |
| Create/edit/delete products | ❌ | ❌ | ✅ | ✅ |
| Create/edit/delete categories | ❌ | ❌ | ✅ | ✅ |
| View all orders | ❌ | ❌ | ✅ | ✅ |
| Update order status | ❌ | ❌ | ✅ | ✅ |
| Issue refunds | ❌ | ❌ | ✅ | ✅ |
| View dashboard/analytics | ❌ | ❌ | ✅ | ✅ |
| Manage users (view/disable) | ❌ | ❌ | ❌ | ✅ |
| Change a user's role | ❌ | ❌ | ❌ | ✅ |

## 6.3 Guest vs. account: which is "best"?

Both are supported, for different moments:

- **Guest checkout** is the default path — lowest friction, no forced signup, reduces cart abandonment.
- **Account creation** is offered, not required — typically prompted *after* a guest completes an order ("save these details for next time?"), or available upfront for returning customers who want order history.

A guest order still creates an `orders` row with `user_id = null` and a `contact_email` for the receipt; if that person later registers with the same email, past guest orders can optionally be linked to the new account.

## 6.4 How role-gating is enforced (conceptually)

- **Backend**: every request carries an auth token/session. A `require-role` check runs before any `/api/admin/*` controller executes (see [03-backend-structure.md](./03-backend-structure.md) §3.3). This is the real security boundary — it must never be trusted to the frontend alone.
- **Frontend**: `AdminLayout` (see [04-frontend-structure.md](./04-frontend-structure.md)) hides admin navigation/pages from non-staff users. This is a UX convenience only — it prevents confusion, it does not replace backend enforcement.

## 6.5 Account states

- `is_active = true/false` on `users` — an Admin can disable an account (e.g. abuse, fraud) without deleting order history tied to it.
- Disabling a Customer account blocks login; it does not delete their past orders (needed for accounting/records).
