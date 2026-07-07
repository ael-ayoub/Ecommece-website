# 8. Project Flow

## 8.1 Customer purchase flow (guest or logged-in)

```
Browse homepage/category
        │
        ▼
Search / apply filters (price, category)  ──► GET /api/products?...
        │
        ▼
Open product page                          ──► GET /api/products/:slug
        │
        ▼
Add to cart                                ──► POST /api/cart/items
        │
        ▼
View/edit cart                             ──► GET /api/cart, PUT/DELETE /api/cart/items/:id
        │
        ▼
Checkout: enter shipping + payment details ──► POST /api/checkout
        │                                        - backend re-validates stock & price
        │                                        - creates `orders` + `order_items` (status: pending)
        │                                        - creates a payment intent with the provider
        ▼
Redirect to payment provider / embedded form
        │
        ▼
Payment provider confirms (async)          ──► POST /api/payments/webhook
        │                                        - marks payment succeeded
        │                                        - order status → paid
        ▼
Order confirmation page shown               ──► GET /api/orders/:id/payment-status
        │
        ▼
Confirmation email sent
        │
        ▼
(Optional) prompt: "create an account to track this order?"
```

## 8.2 Auth flow

```
Register/Login ──► POST /api/auth/register | /api/auth/login
        │              - password hashed (register) / verified (login)
        │              - session/JWT issued
        ▼
Token stored (httpOnly cookie or Authorization header)
        │
        ▼
Every subsequent request ──► auth plugin verifies token, attaches request.user
        │
        ▼
Role check on protected routes ──► require-role middleware (admin/staff-only endpoints)
```

If a guest had items in their cart before logging in, the guest cart (Redis, keyed by session) is merged into the user's persistent cart on login.

## 8.3 Admin flow

```
Admin logs in ──► same auth flow, role = staff/admin
        │
        ▼
Dashboard ──► GET /api/admin/dashboard/summary (revenue, orders, low stock)
        │
        ▼
Add/edit product ──► POST/PUT /api/admin/products
        │              - writes to `products` table
        │              - invalidates product list cache in Redis
        ▼
New product appears on storefront immediately (same DB, cache invalidated)
        │
        ▼
Incoming order appears ──► GET /api/admin/orders
        │
        ▼
Update status: processing → shipped → delivered ──► PUT /api/admin/orders/:id/status
        │
        ▼
(Optional) shipping-update email sent to customer
```

## 8.4 Order status lifecycle

```
pending ──(payment succeeds)──► paid ──► processing ──► shipped ──► delivered
   │                                                                    
   └──(payment fails / customer cancels)──► cancelled
                    
paid/processing ──(admin issues refund)──► refunded
```

## 8.5 Caching flow (why product pages stay fast)

```
Request GET /api/products?category=phones
        │
        ▼
Check Redis for cache key "products:phones:page1"
        │
   hit  │  miss
   ◄────┴────►
   │         │
   ▼         ▼
return    query Postgres → build response → store in Redis (TTL 60s) → return
cached
response
```

Any admin write to `products` or `categories` explicitly deletes the relevant cache keys, so stale data is never shown longer than necessary.
