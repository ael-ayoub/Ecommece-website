import { requireAdminPage } from "@/lib/guards/require-admin-page";
import { AdminShell } from "@/components/admin/AdminShell";

// Page-level access control already happens in src/middleware.ts
// (matcher: /admin/:path* — redirects non-admins away before this renders).
// RealtimeStatusIndicator (a Client Component) is what actually opens the
// admin real-time connection — mounting it here, and only here, is what
// scopes live updates to the admin section (architecture.md §11's "client
// pages don't need live updates" rule) without touching (client)/* pages.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminPage();
  return (
    <AdminShell user={{ name: user.name, email: user.email }}>
      {children}
    </AdminShell>
  );
}
