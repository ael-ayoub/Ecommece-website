# Ecommerce Website — Architecture & Tech Stack Notes

Notes on how ecommerce sites work internally, and the stack chosen for this project.

## 1. The Big Picture

An ecommerce site has three main layers:

1. **Frontend** — what you see and click (pages, buttons, forms)
2. **Backend** — the "brain" that processes logic (checking stock, calculating prices, handling orders)
3. **Database** — where everything is stored (products, users, orders)

There are really only two "front doors" into the same backend + database:

- **Customers** use the storefront (product pages, search, cart, checkout form)
- **The store owner** uses an admin panel (add products, view/manage orders)

Both sides talk to the same backend and database — they're just different interfaces to it.

## 2. Database

Almost always a relational database (MySQL, PostgreSQL) or sometimes a NoSQL one (MongoDB). Typical tables:

- `products` (name, price, description, stock, image, category_id)
- `categories`
- `users` (customers)
- `orders` and `order_items` (which products, quantities, prices — linked to a user)
- `carts` (temporary, before checkout)

## 3. Adding a New Product

The store owner logs into an admin dashboard (a separate, password-protected part of the site). There's a form: name, price, photos, description, category, stock quantity. Submitting it writes a new row into the `products` table. The public storefront just reads from that same table — that's why the new product instantly appears for customers.

## 4. Order Management

When a customer submits the checkout form:

1. Backend validates the cart (stock available? price correct?)
2. Creates a row in `orders` + rows in `order_items`
3. Usually charges payment via a payment processor (Stripe, PayPal, etc.) — the site itself rarely stores card numbers directly
4. Sends a confirmation email
5. Store owner sees the new order appear in their admin dashboard, where they can update its status (processing → shipped → delivered)

## 5. Login: Guest vs. Account

Most real stores support both:

- **Guest checkout** — just fill the form, no account needed. Faster, less friction.
- **Account login** — lets customers see order history, save addresses, reorder easily.

**Best practice:** offer guest checkout by default, but let people optionally create an account (often after the order, "save these details for next time?"). Forcing account creation before purchase is a well-known cause of cart abandonment.

## 6. Hosting Approaches

| Approach | Example | Who manages what |
|---|---|---|
| Hosted platform | Shopify, Wix | Everything — you just add products |
| Self-hosted open source | WooCommerce (WordPress), PrestaShop | You need your own hosting + a bit of setup |
| Custom-built | Your own code (Node.js, Django, Laravel...) | Full control, deployed on a cloud server (AWS, DigitalOcean, Vercel) with a managed database (like AWS RDS) |

A common beginner stack: React/HTML+CSS+JS frontend → Node.js/Express or Django backend → PostgreSQL database, hosted on something like Render or Railway.

---

## 7. Chosen Tech Stack (Self-Hosted, $5-10/mo VPS)

Context: experienced developer, small VPS budget ($5-10/mo), goals are fast load times, works well on old and new devices, stable under load (no crashes/slow loading).

The key trick for old-device compatibility is **sending less JavaScript, not writing more compatibility code.**

### Frontend: Astro (minimal client-side JS)
Renders pages to plain HTML/CSS on the server by default and ships zero JavaScript unless a component actually needs interactivity (cart button, filters, search box — these get "hydrated" individually). An old Android phone or a 10-year-old laptop just has to parse HTML/CSS, not execute a huge React/Vue bundle. Product and category pages become nearly instant.

### Backend: Node.js + Fastify
Fastify over Express — lower overhead, better throughput per CPU core, which matters on a cheap VPS with limited resources. TypeScript on top for type safety.

### Database: PostgreSQL
Reliable, handles relational data (orders, products, users) well, scales fine for small-to-medium stores on a $5-10 VPS.

### Cache: Redis
Cache product listings, session data, and cart state in memory. Prevents slow loading under load by avoiding hitting Postgres on every page view.

### Reverse Proxy: Caddy (instead of Nginx)
Automatic free HTTPS (Let's Encrypt) with almost no config, plus built-in gzip/brotli compression and static file caching.

### CDN: Cloudflare (free tier)
Sits in front of the VPS. Caches images/CSS/JS at edge locations near visitors, absorbs traffic spikes so the VPS doesn't get overwhelmed, and gives free DDoS protection.

### Why This Avoids Crashes and Slow Loading

- **Docker Compose** to run everything (app, Postgres, Redis, Caddy) as isolated containers — one container misbehaving doesn't take down the whole server; restarts are automatic (`restart: unless-stopped`).
- **Image optimization**: use `sharp` (Node library) to auto-generate resized WebP/AVIF images with JPEG fallback. Serve responsive `srcset` images so old phones don't download a 4K product photo.
- **Lazy loading** (`loading="lazy"` on images) — built into HTML now, no JS needed, works on old browsers too.
- **Connection pooling** on Postgres (e.g. `pg-pool`) so traffic spikes don't exhaust database connections.
- **Health checks + auto-restart** via Docker or a simple systemd watchdog, so a crashed process comes back up in seconds rather than leaving the site down.

### Old-Device Compatibility Specifically

- Astro's "islands" approach means old devices skip most JS parsing/execution entirely — this matters more than any polyfill.
- Avoid bleeding-edge CSS/JS features without checking [caniuse.com](https://caniuse.com) first; Astro/Vite auto-transpiles JS, but double-check CSS (e.g. `:has()`, container queries) if older browser support is needed.
- Test with Chrome DevTools' CPU throttling (4x-6x slowdown) to simulate old hardware — cheaper than buying an old phone.

### Suggested VPS

Hetzner or DigitalOcean, $6/mo tier (1 vCPU, 2GB RAM) is enough for this stack at small-to-medium traffic. Ubuntu 24.04 LTS as the OS.

### Stack Summary

| Layer | Choice |
|---|---|
| Frontend | Astro |
| Backend | Node.js + Fastify + TypeScript |
| Database | PostgreSQL |
| Cache | Redis |
| Reverse Proxy | Caddy |
| CDN | Cloudflare (free tier) |
| Container orchestration | Docker Compose |
| VPS | Hetzner / DigitalOcean, $6/mo, 1 vCPU / 2GB RAM, Ubuntu 24.04 LTS |

### Next Steps

- [ ] Sketch project folder structure
- [ ] Write `docker-compose.yml` (app, Postgres, Redis, Caddy)
- [ ] Define database schema (products, categories, users, orders, order_items, carts)
- [ ] Set up admin dashboard for product/order management
- [ ] Implement guest checkout + optional account creation
