# Design Inspiration (Reference Only)

This folder is a mood-board / reference space for visual direction. **Nothing here is a spec or real frontend implementation** — no components, layouts, or styles from here are final. When actual frontend work starts, it's designed and built fresh in `frontend/`, informed by these notes.

## Purpose

Collect what "good" looks like for each key page before writing any UI code, so design decisions are made deliberately rather than improvised while coding.

## Pages to gather inspiration for

- [homepage.md](./homepage.md) — hero, featured categories/products, layout density
- [product-page.md](./product-page.md) — image gallery, price/CTA placement, description layout
- [category-listing.md](./category-listing.md) — filters, grid density, sort controls
- [cart-checkout.md](./cart-checkout.md) — cart drawer vs. page, checkout form steps
- [admin-dashboard.md](./admin-dashboard.md) — data tables, stat cards, navigation

## Where to look

- Real stores: Shopify-powered shops, Amazon, Etsy — for proven ecommerce UX patterns
- Design galleries: Awwwards, Dribbble, Mobbin (mobile + web UI patterns), Land-book
- Payment/checkout specifically: Stripe Checkout, Shop Pay — widely studied for low-friction checkout UX

## Ground rules for this folder

- Save **why** something works (e.g. "price stays visible while scrolling description" — reduces friction), not just "this looks nice."
- Keep notes text/markdown-based (links + short descriptions). Do not paste real code here.
- Performance and accessibility constraints from [../ecommerce-architecture.md](../ecommerce-architecture.md) still apply — an inspiration reference that requires heavy client-side JS should be noted as "adapt, don't copy."
