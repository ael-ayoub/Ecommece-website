# 4. Frontend Structure

Astro, "islands" approach: pages render to static HTML by default; only components that need interactivity are hydrated with JS on the client.

```
frontend/
├── src/
│   ├── pages/
│   │   ├── index.astro                  # homepage
│   │   ├── category/[slug].astro        # category listing + filters
│   │   ├── product/[slug].astro         # product detail page
│   │   ├── search.astro                 # search results page
│   │   ├── cart.astro                   # cart page
│   │   ├── checkout.astro               # checkout form
│   │   ├── order-confirmation/[id].astro
│   │   ├── account/
│   │   │   ├── index.astro              # profile
│   │   │   ├── orders.astro             # order history
│   │   │   └── addresses.astro
│   │   ├── login.astro
│   │   ├── register.astro
│   │   └── admin/
│   │       ├── index.astro              # dashboard
│   │       ├── products/
│   │       │   ├── index.astro          # product list/manage
│   │       │   ├── new.astro
│   │       │   └── [id]/edit.astro
│   │       ├── categories/index.astro
│   │       ├── orders/
│   │       │   ├── index.astro
│   │       │   └── [id].astro
│   │       └── users/index.astro
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro             # storefront shell: header, footer, nav
│   │   └── AdminLayout.astro            # admin shell: sidebar nav, auth-gated
│   │
│   ├── components/
│   │   ├── storefront/
│   │   │   ├── ProductCard.astro
│   │   │   ├── ProductGrid.astro
│   │   │   ├── CategoryFilters.{astro,jsx}   # interactive → hydrated island
│   │   │   ├── SearchBar.{astro,jsx}         # interactive → hydrated island
│   │   │   ├── CartDrawer.{astro,jsx}        # interactive → hydrated island
│   │   │   ├── QuantitySelector.jsx          # interactive → hydrated island
│   │   │   └── CheckoutForm.jsx              # interactive → hydrated island
│   │   └── admin/
│   │       ├── ProductForm.jsx
│   │       ├── OrderStatusControl.jsx
│   │       └── DataTable.jsx
│   │
│   ├── lib/
│   │   ├── api-client.js                # thin fetch wrapper for calling the backend `/api/*`
│   │   ├── auth.js                      # reads current session, redirects if not authorized
│   │   └── format.js                    # price/date formatting
│   │
│   └── styles/
│       └── global.css
│
├── public/
│   ├── favicon.svg
│   └── images/
│
├── astro.config.mjs
└── package.json
```

## 4.1 Static vs. interactive (island) components

| Static (no JS shipped) | Interactive (hydrated island) |
|---|---|
| ProductCard, ProductGrid | CategoryFilters (checkboxes trigger re-fetch) |
| Header, Footer, layouts | SearchBar (live suggestions) |
| Order confirmation page | CartDrawer (add/remove/update quantity) |
| Static product description/images | QuantitySelector |
| Admin table shells | CheckoutForm (validation, submit) |
| | ProductForm / OrderStatusControl (admin) |

Rule of thumb: if a component only *displays* data, keep it a plain `.astro` component. If it needs to *react to clicks/typing without a full page reload*, it's an island.

## 4.2 Storefront vs. admin

- Both live in the same Astro project, under `pages/` vs `pages/admin/`.
- `AdminLayout.astro` checks the user's role (via `lib/auth.js`) before rendering; non-staff users get redirected.
- Admin pages are allowed to ship more JS (data tables, forms) since the audience is small (store staff), unlike storefront pages which must stay light for arbitrary customer devices.

## 4.3 Data fetching pattern

- Storefront pages fetch data **server-side** at request time (Astro's server rendering) by calling the backend API from `lib/api-client.js` — the customer's browser never needs to know the backend's internal URL.
- Interactive islands (cart, filters, search) fetch **client-side** against public `/api/*` endpoints exposed through Caddy, for interactions after the initial page load.
