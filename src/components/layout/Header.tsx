"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

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
