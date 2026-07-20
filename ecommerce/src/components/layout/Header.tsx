"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import type { CategoryDto } from "@/types/product";
import { StorefrontContainer } from "@/components/storefront/StorefrontContainer";

function HeaderSearch({
  id,
  onNavigate,
}: {
  id: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(
      trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : "/products",
    );
    onNavigate?.();
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="client-header-search relative w-full"
    >
      <label htmlFor={id} className="sr-only">
        Search Products
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--client-text-secondary)]"
      />
      <input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search Products"
        className="h-11 w-full rounded-full border border-[var(--client-border-subtle)] bg-[var(--client-surface-muted)] pl-10 pr-12 text-base text-[var(--client-text-primary)] outline-none transition focus:border-[var(--client-text-primary)] focus:ring-2 focus:ring-[var(--client-focus-ring)]/20"
      />
      <button
        type="submit"
        aria-label="Submit Product search"
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[var(--client-text-secondary)] transition hover:bg-white hover:text-[var(--client-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)]"
      >
        <Search aria-hidden="true" className="size-4" />
      </button>
    </form>
  );
}

function CartLink({ onNavigate }: { onNavigate?: () => void }) {
  const { itemCount, hydrated } = useCart();
  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      className="client-header-action relative"
      aria-label={`Cart${hydrated && itemCount > 0 ? `, ${itemCount} items` : ""}`}
    >
      <ShoppingCart aria-hidden="true" className="size-5" />
      <span className="hidden lg:inline">Cart</span>
      {hydrated && itemCount > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-[var(--client-accent)] px-1.5 py-0.5 text-[11px] font-bold leading-4 text-white">
          {itemCount}
        </span>
      )}
    </Link>
  );
}

export function Header({ categories }: { categories: CategoryDto[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const logoutLocked = useRef(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        const focusable = mobilePanelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    function closeAccount(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !accountRef.current?.contains(event.target)
      ) {
        setAccountOpen(false);
      }
    }
    function closeAccountWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("pointerdown", closeAccount);
    document.addEventListener("keydown", closeAccountWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeAccount);
      document.removeEventListener("keydown", closeAccountWithKeyboard);
    };
  }, [accountOpen]);

  async function handleLogout() {
    if (logoutLocked.current) return;
    logoutLocked.current = true;
    setLogoutError(false);
    try {
      await logout();
      setAccountOpen(false);
      setMobileOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setLogoutError(true);
    } finally {
      logoutLocked.current = false;
    }
  }

  const accountLinks = user ? (
    <>
      <Link href="/account" className="client-menu-link">
        <UserRound aria-hidden="true" className="size-4" />
        Profile
      </Link>
      <Link href="/orders" className="client-menu-link">
        <ShoppingBag aria-hidden="true" className="size-4" />
        My Orders
      </Link>
      {user.role === "ADMIN" && (
        <Link href="/admin/dashboard" className="client-menu-link">
          Admin dashboard
        </Link>
      )}
      <button onClick={handleLogout} className="client-menu-link text-left">
        <LogOut aria-hidden="true" className="size-4" />
        Logout
      </button>
    </>
  ) : null;

  return (
    <header className="client-site-header sticky top-0 z-40 border-b border-[var(--client-border-subtle)] bg-[var(--client-surface)]/95 backdrop-blur">
      <StorefrontContainer>
        <div className="client-header-inner flex h-16 items-center gap-3 lg:h-18">
          <Link
            href="/"
            className="client-brand flex shrink-0 items-center gap-2 rounded-md font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)] focus-visible:ring-offset-2"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-[var(--client-text-primary)] text-white shadow-sm">
              <ShoppingBag aria-hidden="true" className="size-5" />
            </span>
            <span className="hidden sm:inline">E-Commerce</span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="ml-3 hidden items-center gap-1 text-sm font-medium lg:flex"
          >
            <Link
              href="/products"
              className="client-header-link"
              aria-current={pathname === "/products" ? "page" : undefined}
            >
              Products
            </Link>
            <details className="group relative">
              <summary className="client-header-link cursor-pointer list-none">
                Categories
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 transition group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <div className="absolute left-0 top-full mt-2 min-w-52 rounded-xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-2 shadow-[var(--client-shadow-lg)]">
                <Link href="/products" className="client-menu-link">
                  All Products
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${encodeURIComponent(category.slug)}`}
                    className="client-menu-link"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </details>
          </nav>

          <div className="mx-auto hidden max-w-md flex-1 md:block">
            <HeaderSearch id="desktop-product-search" />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <CartLink />
            {!isLoading &&
              (user ? (
                <div ref={accountRef} className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((open) => !open)}
                    className="client-header-action"
                    aria-expanded={accountOpen}
                    aria-haspopup="true"
                  >
                    <UserRound aria-hidden="true" className="size-5" />
                    <span className="max-w-28 truncate">{user.name}</span>
                    <ChevronDown aria-hidden="true" className="size-4" />
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 top-full mt-2 min-w-52 rounded-xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-2 shadow-[var(--client-shadow-lg)]">
                      <p className="px-3 pb-2 pt-1 text-xs text-[var(--client-text-secondary)]">
                        Signed in as {user.email}
                      </p>
                      {accountLinks}
                      {logoutError && (
                        <p
                          role="alert"
                          className="px-3 py-2 text-xs text-red-700"
                        >
                          Could not log out. Please try again.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden items-center gap-1 md:flex">
                  <Link href="/login" className="client-header-link">
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="client-button-primary min-h-10 px-4"
                  >
                    Register
                  </Link>
                </div>
              ))}
            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileOpen(true)}
              className="client-icon-button lg:hidden"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
        <div className="pb-3 md:hidden">
          <HeaderSearch id="mobile-product-search" />
        </div>
      </StorefrontContainer>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-stone-950/50"
          />
          <aside
            ref={mobilePanelRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Store navigation"
            className="absolute right-0 top-0 flex h-dvh w-full max-w-sm flex-col overflow-y-auto bg-[var(--client-surface)] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">Menu</span>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close navigation menu"
                onClick={() => {
                  setMobileOpen(false);
                  menuButtonRef.current?.focus();
                }}
                className="client-icon-button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <nav aria-label="Mobile navigation" className="mt-6 flex flex-col">
              <Link href="/" className="client-mobile-link">
                Home
              </Link>
              <Link href="/products" className="client-mobile-link">
                All Products
              </Link>
              <p className="mb-1 mt-5 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--client-text-secondary)]">
                Categories
              </p>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  className="client-mobile-link"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t border-[var(--client-border-subtle)] pt-5">
              {isLoading ? (
                <p className="px-3 text-sm text-[var(--client-text-secondary)]">
                  Loading account…
                </p>
              ) : user ? (
                <div className="flex flex-col">
                  <p className="mb-2 px-3 text-sm font-semibold">{user.name}</p>
                  {accountLinks}
                  {logoutError && (
                    <p role="alert" className="px-3 py-2 text-xs text-red-700">
                      Could not log out. Please try again.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/login" className="client-button-secondary">
                    Login
                  </Link>
                  <Link href="/register" className="client-button-primary">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
