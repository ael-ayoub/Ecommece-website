import { requireUser } from "@/lib/guards/require-user";
import { ForbiddenError } from "@/lib/errors";
import { Role } from "@prisma/client";
import type { AuthUser } from "@/types/auth";

// Call at the top of any API route handler restricted to admins. Requires a
// logged-in user (401 if none) AND role === ADMIN (403 otherwise).
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    throw new ForbiddenError("Admin access required.");
  }
  return user;
}
