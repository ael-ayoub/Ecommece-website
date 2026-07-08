import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AdminAccessTokenPayload {
  sub: string; // admin id
  role: "SUPER_ADMIN" | "STAFF";
}

export interface AdminRefreshTokenPayload {
  sub: string; // admin id
  jti: string; // unique id, matched against the hashed row in admin_refresh_tokens
}

export function signAdminAccessToken(payload: AdminAccessTokenPayload): string {
  return jwt.sign(payload, env.ADMIN_JWT_ACCESS_SECRET, {
    expiresIn: env.ADMIN_JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAdminAccessToken(token: string): AdminAccessTokenPayload {
  return jwt.verify(token, env.ADMIN_JWT_ACCESS_SECRET) as AdminAccessTokenPayload;
}

/**
 * Refresh tokens are themselves short JWTs (so /refresh can identify the admin
 * without a valid access token) but the jti is what's actually checked against
 * the hashed, revocable row in admin_refresh_tokens.
 */
export function issueAdminRefreshToken(adminId: string): { token: string; jti: string; expiresAt: Date } {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + env.ADMIN_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const token = jwt.sign({ sub: adminId, jti } satisfies AdminRefreshTokenPayload, env.ADMIN_JWT_ACCESS_SECRET, {
    expiresIn: `${env.ADMIN_REFRESH_TOKEN_TTL_DAYS}d` as jwt.SignOptions["expiresIn"],
  });
  return { token, jti, expiresAt };
}

export function verifyAdminRefreshToken(token: string): AdminRefreshTokenPayload {
  return jwt.verify(token, env.ADMIN_JWT_ACCESS_SECRET) as AdminRefreshTokenPayload;
}
