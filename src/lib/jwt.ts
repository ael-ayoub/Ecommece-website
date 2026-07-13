import jwt from "jsonwebtoken";
import type { JwtPayload } from "@/types/auth";

const JWT_EXPIRES_IN = "7d";

// Read lazily, inside each function, rather than at module load time.
// A top-level throw-if-missing check here fails Next.js's build step even
// for routes that never call these functions: `next build` imports every
// route module to analyze it, and a containerized build has no access to
// runtime env vars (those are only injected when the container actually
// starts) — so this must not run any validation until a token is actually
// signed or verified.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getSecret()) as JwtPayload;
  } catch {
    return null;
  }
}
