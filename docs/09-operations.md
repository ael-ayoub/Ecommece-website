# 9. All Operations of the Platform

A complete list of actions the system supports, grouped by domain. This is the operational checklist — every endpoint in [02-api-endpoints.md](./02-api-endpoints.md) implements one of these.

## 9.1 Catalog operations
- Create / edit / delete a category (including subcategories)
- Create / edit / delete a product
- Upload, reorder, or remove product images
- Set/update stock quantity
- Publish or unpublish (draft) a product
- Bulk update price or stock (phase 2)
- Search products by keyword
- Filter products by category, price range
- Sort products (price, newest, popularity)
- View a single product's detail page
- View related/recommended products

## 9.2 Cart operations
- Create a cart (implicit — first add-to-cart for a new session)
- Add an item to the cart
- Update an item's quantity
- Remove an item from the cart
- Clear the entire cart
- Merge a guest cart into a user's cart on login
- Expire abandoned guest carts (TTL in Redis)

## 9.3 Checkout & order operations
- Validate cart contents against live stock/price before charging
- Create an order (with snapshotted item prices/names)
- Create a payment intent with the payment provider
- Confirm payment via webhook
- Cancel an order (customer, while still allowed)
- Update order status (staff): processing → shipped → delivered
- Cancel an order (staff)
- Issue a refund (staff)
- View order history (customer, own orders only)
- View all orders with filters (staff): by status, date range, customer

## 9.4 User & account operations
- Register a new account
- Log in / log out
- Reset a forgotten password
- View/update own profile (name, email, phone)
- Add / edit / delete a saved address
- Set a default address
- (Admin) view list of all users
- (Admin) view a single user's detail + order history
- (Admin) change a user's role
- (Admin) enable/disable a user account

## 9.5 Review operations (phase 2)
- Submit a review for a purchased product
- View reviews on a product page
- (Staff) remove an inappropriate review

## 9.6 Notification operations
- Send order confirmation email
- Send shipping-status-update email
- Send password-reset email
- (Optional) low-stock alert email to staff

## 9.7 Admin dashboard operations
- View revenue/order summary for a time period
- View recent orders
- View low-stock products
- View sales-over-time chart data

## 9.8 Platform/infra operations
- Health check (liveness/readiness for the backend, DB, Redis)
- Cache invalidation on catalog writes
- Database migrations on deploy
- Backups of the Postgres database (see hosting notes in [ecommerce-architecture.md](./ecommerce-architecture.md))
