// Edge-runtime-safe JWT verification for use in middleware.ts (Next.js
// Middleware runs on the Edge runtime, where the Node `jsonwebtoken` package
// — used everywhere else via src/lib/jwt.ts — isn't available). This file
// verifies tokens created by src/lib/jwt.ts's signJwt(); both use the same
// HS256 secret and payload shape, so a token from one verifies with the other.
import { jwtVerify } from "jose";
import type { JwtPayload } from "@/types/auth";

const encodedSecret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function verifyJwtEdge(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
