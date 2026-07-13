// Edge-runtime-safe JWT verification for use in middleware.ts (Next.js
// Middleware runs on the Edge runtime, where the Node `jsonwebtoken` package
// — used everywhere else via src/lib/jwt.ts — isn't available). This file
// verifies tokens created by src/lib/jwt.ts's signJwt(); both use the same
// HS256 secret and payload shape, so a token from one verifies with the other.
import { jwtVerify } from "jose";
import type { JwtPayload } from "@/types/auth";

// Encoded lazily (not at module load) — same reasoning as src/lib/jwt.ts:
// avoids depending on JWT_SECRET being present at import time, and avoids
// silently verifying against an empty-string secret if it's ever unset.
export async function verifyJwtEdge(token: string): Promise<JwtPayload | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
