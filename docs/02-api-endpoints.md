# 2. API Endpoints

All endpoints are prefixed with `/api`. Auth column: **Public** (no login), **Customer** (any logged-in user), **Staff** (admin/editor role). See [06-roles-permissions.md](./06-roles-permissions.md) for role definitions.

## 2.1 Auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a customer account |
| POST | `/api/auth/login` | Public | Log in, returns session/JWT |
| POST | `/api/auth/logout` | Customer | Invalidate current session |
| POST | `/api/auth/refresh` | Customer | Refresh an expiring access token |
| POST | `/api/auth/forgot-password` | Public | Send password reset email |
| POST | `/api/auth/reset-password` | Public | Reset password via emailed token |
| GET | `/api/auth/me` | Customer | Return current logged-in user's profile |

## 2.2 Categories

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/categories` | Public | List all categories (tree or flat) |
| GET | `/api/categories/:slug` | Public | Category detail + its products |
| POST | `/api/admin/categories` | Staff | Create category |
| PUT | `/api/admin/categories/:id` | Staff | Update category |
| DELETE | `/api/admin/categories/:id` | Staff | Delete category |

## 2.3 Products

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/products` | Public | List products — supports `?category=`, `?q=`, `?min_price=`, `?max_price=`, `?sort=`, `?page=` |
| GET | `/api/products/:slug` | Public | Product detail page data |
| GET | `/api/products/:id/related` | Public | Related/recommended products |
| POST | `/api/admin/products` | Staff | Create product |
| PUT | `/api/admin/products/:id` | Staff | Update product (price, stock, description, images) |
| DELETE | `/api/admin/products/:id` | Staff | Delete (or soft-delete/archive) product |
| POST | `/api/admin/products/:id/images` | Staff | Upload/attach product images |

## 2.4 Cart

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/cart` | Public* | Get current cart (guest cart keyed by session cookie, or user's cart if logged in) |
| POST | `/api/cart/items` | Public* | Add item (product_id, quantity) |
| PUT | `/api/cart/items/:itemId` | Public* | Update quantity |
| DELETE | `/api/cart/items/:itemId` | Public* | Remove item |
| DELETE | `/api/cart` | Public* | Clear cart |

\* "Public" here means no account required, but the cart is tied to an anonymous session id stored in Redis; it gets merged into the user's cart on login.

## 2.5 Checkout & Orders

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/checkout` | Public* | Validate cart, create order, kick off payment (guest checkout allowed) |
| GET | `/api/orders` | Customer | List the logged-in customer's past orders |
| GET | `/api/orders/:id` | Customer | Order detail (own order only) |
| POST | `/api/orders/:id/cancel` | Customer | Cancel an order while still cancellable |
| GET | `/api/admin/orders` | Staff | List all orders — supports `?status=`, `?date_from=`, `?date_to=` |
| GET | `/api/admin/orders/:id` | Staff | Full order detail for fulfillment |
| PUT | `/api/admin/orders/:id/status` | Staff | Update status: processing → shipped → delivered / cancelled / refunded |

## 2.6 Payments

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/payments/webhook` | Public (signature-verified) | Receive async payment confirmation from provider (Stripe/PayPal) |
| GET | `/api/orders/:id/payment-status` | Customer | Poll payment status for the order confirmation page |

## 2.7 Users & Addresses

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/account/profile` | Customer | Get own profile |
| PUT | `/api/account/profile` | Customer | Update name/email/phone |
| GET | `/api/account/addresses` | Customer | List saved addresses |
| POST | `/api/account/addresses` | Customer | Add address |
| PUT | `/api/account/addresses/:id` | Customer | Update address |
| DELETE | `/api/account/addresses/:id` | Customer | Delete address |

## 2.8 Admin — Users & Roles

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/admin/users` | Staff (admin only) | List platform users |
| GET | `/api/admin/users/:id` | Staff (admin only) | User detail |
| PUT | `/api/admin/users/:id/role` | Staff (admin only) | Change a user's role |
| PUT | `/api/admin/users/:id/status` | Staff (admin only) | Enable/disable (ban) an account |

## 2.9 Admin — Dashboard

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/admin/dashboard/summary` | Staff | Revenue, order count, low-stock alerts, recent orders |
| GET | `/api/admin/dashboard/sales` | Staff | Sales over time, for charts |

## 2.10 Reviews (optional / phase 2)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/products/:id/reviews` | Public | List reviews for a product |
| POST | `/api/products/:id/reviews` | Customer | Submit a review (must have purchased) |

## 2.11 Misc

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness/readiness probe (checks DB + Redis) |
| GET | `/api/search/suggestions` | Public | Autocomplete suggestions as the user types |
