import { db } from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";
import { getAuthCookie } from "@/lib/auth-cookie";
import type { AuthUser } from "@/types/auth";

// The one place "who is logged in" gets resolved from the request cookie —
// used by API routes, Server Components, and layouts alike.
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getAuthCookie();
  if (!token) return null;

  const payload = verifyJwt(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: Number(payload.sub) },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  return user?.isActive ? user : null;
}
