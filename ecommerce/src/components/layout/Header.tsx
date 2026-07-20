"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

export function Header() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { itemCount, hydrated } = useCart();

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 py-4 sm:flex-nowrap sm:px-6">
        <Link
          href="/"
          className="whitespace-nowrap text-lg font-bold text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
        >
          E-Commerce Platform
        </Link>

        <nav className="order-3 mt-3 flex w-full items-center gap-4 overflow-x-auto border-t border-stone-100 pt-3 text-sm text-stone-700 sm:order-none sm:mt-0 sm:w-auto sm:border-0 sm:pt-0">
          <Link
            href="/products"
            className="inline-flex min-h-11 shrink-0 items-center font-medium hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          >
            Products
          </Link>

          <Link
            href="/cart"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-medium hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          >
            <ShoppingCart aria-hidden="true" className="size-4" />
            Cart
            {hydrated && itemCount > 0 && (
              <span className="rounded-full bg-stone-900 px-1.5 py-0.5 text-xs text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {isLoading ? null : user ? (
            <>
              <Link
                href="/account"
                className="inline-flex min-h-11 shrink-0 items-center hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
              >
                {user.name}
              </Link>
              <Link
                href="/orders"
                className="inline-flex min-h-11 shrink-0 items-center hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
              >
                My Orders
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin/dashboard"
                  className="inline-flex min-h-11 shrink-0 items-center hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex min-h-11 shrink-0 items-center hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 shrink-0 items-center hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-11 shrink-0 items-center hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
