"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <Link href="/" className="text-lg font-bold">
        E-Commerce Platform
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        <Link href="/products" className="hover:underline">
          Products
        </Link>

        <Link href="/cart" className="flex items-center gap-1 hover:underline">
          🛒 Cart
          {hydrated && itemCount > 0 && (
            <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-xs text-white">
              {itemCount}
            </span>
          )}
        </Link>

        {isLoading ? null : user ? (
          <>
            <Link href="/account" className="hover:underline">
              {user.name}
            </Link>
            {user.role === "ADMIN" && (
              <Link href="/admin/products" className="hover:underline">
                Admin
              </Link>
            )}
            <button onClick={handleLogout} className="hover:underline">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              Login
            </Link>
            <Link href="/register" className="hover:underline">
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
