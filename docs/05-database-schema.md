# 5. Database Schema

PostgreSQL. Naming: snake_case tables, singular relation names, `id` as UUID or bigint primary key (bigint assumed below for simplicity).

## 5.1 Entity relationship overview

```
users ──< addresses
  │
  ├──< orders ──< order_items >── products >── categories
  │      │
  │      └── payments
  │
  └──< carts ──< cart_items >── products

roles ──< users
```

## 5.2 Tables

### `roles`
| Column | Type | Notes |
|---|---|---|
| id | smallint PK | |
| name | text unique | `customer`, `staff`, `admin` |

### `users`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| role_id | FK → roles.id | default `customer` |
| email | text unique | |
| password_hash | text | bcrypt/argon2 hash, never plaintext |
| full_name | text | |
| phone | text nullable | |
| is_active | boolean | default true; false = disabled/banned |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `addresses`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users.id | nullable for guest-order addresses |
| label | text | "Home", "Work" |
| line1, line2 | text | |
| city, state, postal_code, country | text | |
| is_default | boolean | |

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| parent_id | FK → categories.id nullable | for subcategories |
| name | text | |
| slug | text unique | used in URLs |

### `products`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| category_id | FK → categories.id | |
| name | text | |
| slug | text unique | |
| description | text | |
| price_cents | integer | store money as integer cents, never float |
| currency | text | e.g. `USD` |
| stock_quantity | integer | |
| is_published | boolean | draft vs. visible on storefront |
| created_at / updated_at | timestamptz | |

### `product_images`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| product_id | FK → products.id | |
| url | text | |
| sort_order | integer | |

### `carts`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users.id nullable | null = guest cart |
| session_token | text nullable | identifies guest cart (stored in Redis + cookie) |
| created_at / updated_at | timestamptz | |

### `cart_items`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| cart_id | FK → carts.id | |
| product_id | FK → products.id | |
| quantity | integer | |
| unit_price_cents | integer | snapshot of price when added |

### `orders`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users.id nullable | null = guest order |
| status | text | `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| subtotal_cents | integer | |
| shipping_cents | integer | |
| total_cents | integer | |
| shipping_address_id | FK → addresses.id | |
| contact_email | text | for guest orders / receipts |
| created_at / updated_at | timestamptz | |

### `order_items`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| order_id | FK → orders.id | |
| product_id | FK → products.id | |
| product_name_snapshot | text | product name at time of order (in case it changes later) |
| quantity | integer | |
| unit_price_cents | integer | price at time of order |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| order_id | FK → orders.id | |
| provider | text | `stripe`, `paypal` |
| provider_reference | text | charge/session id from the provider |
| status | text | `pending`, `succeeded`, `failed`, `refunded` |
| amount_cents | integer | |
| created_at | timestamptz | |

### `reviews` (optional / phase 2)
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| product_id | FK → products.id | |
| user_id | FK → users.id | |
| rating | smallint | 1–5 |
| comment | text | |
| created_at | timestamptz | |

## 5.3 Conventions

- **Money** is always stored as integer cents (`price_cents`), never floating point — avoids rounding bugs.
- **Soft state, not deletion** for products (`is_published`) so historical `order_items` still reference a real row even if a product is pulled from sale.
- **Snapshots on `order_items`** (`product_name_snapshot`, `unit_price_cents`) so past invoices stay accurate even if the product is later renamed or repriced.
- Every table gets `created_at`; mutable tables also get `updated_at`.
