import { getCurrentUser } from "@/lib/get-current-user";
import { UnauthorizedError } from "@/lib/errors";
import type { AuthUser } from "@/types/auth";

// Call at the top of any API route handler that requires a logged-in user.
// Throws (caught by handleApiError -> 401) if there's no valid session.
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
