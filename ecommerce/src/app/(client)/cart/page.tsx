"use client";

import Link from "next/link";
import { ArrowRight, Banknote, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { CartItemCard } from "@/components/cart/CartItemCard";
import { StorefrontState } from "@/components/storefront/StorefrontState";
import { formatCurrency } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, hydrated } = useCart();

  if (!hydrated) {
    return (
      <main
        aria-busy="true"
        aria-label="Loading cart"
        className="animate-pulse pb-12 motion-reduce:animate-none"
      >
        <div className="h-10 w-48 rounded bg-stone-200" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="h-64 rounded-2xl bg-stone-100" />
          <div className="h-72 rounded-2xl bg-stone-100" />
        </div>
        <span className="sr-only">Loading your cart…</span>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main>
        <StorefrontState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse the catalogue and add an available Product to begin your order."
          actionHref="/products"
          actionLabel="Browse Products"
        />
      </main>
    );
  }

  return (
    <main className="pb-12">
      <header className="max-w-2xl">
        <p className="client-eyebrow">Review your selection</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Your Cart
        </h1>
        <p className="mt-3 text-base text-[var(--client-text-secondary)]">
          Check quantities and selected SKUs before continuing to delivery
          information.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="cart-items-heading">
          <h2 id="cart-items-heading" className="sr-only">
            Cart items
          </h2>
          <div className="space-y-4">
            {items.map((item) => (
              <CartItemCard key={item.id} item={item} />
            ))}
          </div>
          <Link
            href="/products"
            className="client-text-link mt-5 font-semibold"
          >
            Continue shopping
          </Link>
        </section>

        <aside
          aria-labelledby="cart-summary-heading"
          className="rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5 shadow-[var(--client-shadow-md)] lg:sticky lg:top-24"
        >
          <h2 id="cart-summary-heading" className="text-xl font-semibold">
            Order summary
          </h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--client-text-secondary)]">Subtotal</dt>
              <dd className="font-semibold tabular-nums">
                {formatCurrency(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--client-text-secondary)]">Shipping</dt>
              <dd className="font-semibold tabular-nums">
                {formatCurrency(0)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--client-border-subtle)] pt-4 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-bold tabular-nums">
                {formatCurrency(subtotal)}
              </dd>
            </div>
          </dl>
          <Link href="/checkout" className="client-button-primary mt-6 w-full">
            Proceed to Checkout
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--client-text-secondary)]">
            <Banknote aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Payment method: Cash on Delivery.
          </p>
        </aside>
      </div>
    </main>
  );
}
