import Link from "next/link";

// Page-level access control already happens in src/middleware.ts
// (matcher: /admin/:path* — redirects non-admins away before this renders).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-200 p-4">
        <p className="mb-4 font-bold">Admin</p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/admin/products" className="rounded px-2 py-1 hover:bg-gray-100">
            Products
          </Link>
          <Link href="/admin/categories" className="rounded px-2 py-1 hover:bg-gray-100">
            Categories
          </Link>
        </nav>
        <Link href="/" className="mt-6 block text-xs text-gray-500 hover:underline">
          ← Back to storefront
        </Link>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
