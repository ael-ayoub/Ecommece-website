import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env.js";
import { getSession } from "../lib/session.js";
import { UnauthorizedError } from "../lib/errors.js";

/** Attaches request.user if a valid session cookie is present. Never throws — use for guest-allowed routes. */
export async function attachCustomerSession(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const sessionId = request.cookies[env.SESSION_COOKIE_NAME];
  if (!sessionId) return;

  const session = await getSession(sessionId);
  if (session) {
    request.user = { id: session.userId };
  }
}

/** Same as attachCustomerSession but throws if no logged-in user — use for account-only routes. */
export async function requireCustomerAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await attachCustomerSession(request, reply);
  if (!request.user) throw new UnauthorizedError("Login required");
}
