import Link from "next/link";
import { Banknote, ShoppingBag } from "lucide-react";
import { StorefrontContainer } from "./StorefrontContainer";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--client-border-subtle)] bg-[var(--client-surface-muted)]">
      <StorefrontContainer className="grid gap-8 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)] focus-visible:ring-offset-2"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-[var(--client-text-primary)] text-white">
              <ShoppingBag aria-hidden="true" className="size-5" />
            </span>
            E-Commerce Platform
          </Link>
          <p className="mt-4 text-sm leading-6 text-[var(--client-text-secondary)]">
            Browse available Products, choose the SKU that fits, and order with
            clear pricing and availability.
          </p>
        </div>

        <nav aria-label="Store links">
          <h2 className="text-sm font-semibold">Shop</h2>
          <div className="mt-3 flex flex-col items-start gap-2 text-sm text-[var(--client-text-secondary)]">
            <Link className="client-text-link" href="/products">
              Browse Products
            </Link>
            <Link className="client-text-link" href="/cart">
              Cart
            </Link>
          </div>
        </nav>

        <div>
          <h2 className="text-sm font-semibold">Your account</h2>
          <div className="mt-3 flex flex-col items-start gap-2 text-sm text-[var(--client-text-secondary)]">
            <Link className="client-text-link" href="/account">
              Profile
            </Link>
            <Link className="client-text-link" href="/orders">
              My Orders
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm font-medium">
            <Banknote aria-hidden="true" className="size-4" />
            Cash on Delivery
          </p>
        </div>
      </StorefrontContainer>
      <div className="border-t border-[var(--client-border-subtle)]">
        <StorefrontContainer className="py-4 text-xs text-[var(--client-text-secondary)]">
          © {new Date().getFullYear()} E-Commerce Platform
        </StorefrontContainer>
      </div>
    </footer>
  );
}
