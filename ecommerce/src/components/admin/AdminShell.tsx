"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Boxes,
  ChevronRight,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Settings2,
  ShoppingBag,
  Store,
  UsersRound,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { RealtimeStatusIndicator } from "@/components/admin/RealtimeStatusIndicator";

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: PackageSearch },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/clients", label: "Clients", icon: UsersRound },
  {
    href: "/admin/settings/product-options",
    label: "Option Presets",
    icon: Settings2,
  },
] as const;

function currentPage(pathname: string) {
  if (pathname.includes("/variants")) return "Manage Variants";
  if (pathname === "/admin/products/new") return "Create Product";
  if (/^\/admin\/products\/\d+$/.test(pathname)) return "Edit Product";
  if (/^\/admin\/orders\/\d+$/.test(pathname)) return "Order Details";
  if (/^\/admin\/clients\/\d+$/.test(pathname)) return "Client Details";
  return (
    navigation.find(
      ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
    )?.label ?? "Admin"
  );
}

export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const pageTitle = currentPage(pathname);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [mobileOpen]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const sidebar = (
    <>
      <div className="admin-brand">
        <span className="admin-brand-mark">
          <Boxes aria-hidden="true" />
        </span>
        <span>
          <strong>Commerce</strong>
          <small>Administration</small>
        </span>
      </div>
      <div className="admin-realtime">
        <RealtimeStatusIndicator />
      </div>
      <nav aria-label="Admin navigation" className="admin-nav">
        <p className="admin-nav-label">Workspace</p>
        {navigation.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="admin-nav-link"
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-nav-link">
          <Store aria-hidden="true" />
          <span>View storefront</span>
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="admin-nav-link admin-logout"
        >
          <LogOut aria-hidden="true" />
          <span>{loggingOut ? "Logging out…" : "Log out"}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-app">
      <a href="#admin-main" className="admin-skip-link">
        Skip to admin content
      </a>
      <aside className="admin-sidebar">{sidebar}</aside>
      <div className="admin-workspace">
        <header className="admin-header">
          <button
            ref={triggerRef}
            type="button"
            aria-label="Open admin navigation"
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-navigation"
            onClick={() => setMobileOpen(true)}
            className="admin-icon-button lg:hidden"
          >
            <Menu aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="admin-breadcrumbs">
              <Link href="/admin/dashboard">Admin</Link>
              <ChevronRight aria-hidden="true" />
              <span aria-current="page">{pageTitle}</span>
            </nav>
            <p className="admin-header-title">{pageTitle}</p>
          </div>
          <div className="admin-user">
            <span aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className="admin-main">
          {children}
        </main>
      </div>
      {mobileOpen && (
        <div className="admin-mobile-layer lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="admin-mobile-scrim"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={panelRef}
            id="admin-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="admin-mobile-panel"
          >
            <button
              ref={closeRef}
              type="button"
              aria-label="Close admin navigation"
              onClick={() => {
                setMobileOpen(false);
                triggerRef.current?.focus();
              }}
              className="admin-icon-button admin-mobile-close"
            >
              <X aria-hidden="true" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
    </div>
  );
}
