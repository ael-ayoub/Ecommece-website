import type { FastifyRequest, FastifyReply } from "fastify";
import { ADMIN_ACCESS_COOKIE } from "../config/constants.js";
import { verifyAdminAccessToken } from "../lib/tokens.js";
import { UnauthorizedError } from "../lib/errors.js";
import { prisma } from "../lib/prisma-client.js";

/** Verifies the admin access token AND re-checks is_disabled on every request — admin disabling must take effect immediately. */
export async function requireAdminAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = request.cookies[ADMIN_ACCESS_COOKIE];
  if (!token) throw new UnauthorizedError("Admin authentication required");

  let payload;
  try {
    payload = verifyAdminAccessToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired admin session");
  }

  const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
  if (!admin || admin.is_disabled) {
    throw new UnauthorizedError("Admin account is disabled or no longer exists");
  }

  request.admin = { id: admin.id, email: admin.email, role: admin.role };
}

export function requireAdminRole(...roles: Array<"SUPER_ADMIN" | "STAFF">) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.admin || !roles.includes(request.admin.role)) {
      throw new UnauthorizedError("Insufficient admin privileges");
    }
  };
}
