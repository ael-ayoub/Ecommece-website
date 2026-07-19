import { getCurrentUser } from "@/lib/get-current-user";

// Protected by src/middleware.ts (matcher includes /account/:path*) — if this
// component ever renders, getCurrentUser() is guaranteed to return a user.
export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-bold">My Profile</h1>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-gray-500">Name</dt>
          <dd>{user?.name}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Email</dt>
          <dd>{user?.email}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Phone</dt>
          <dd>{user?.phone}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Role</dt>
          <dd>{user?.role}</dd>
        </div>
      </dl>
    </div>
  );
}
