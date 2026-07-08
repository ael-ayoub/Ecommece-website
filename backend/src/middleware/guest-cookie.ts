import { randomUUID } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env.js";

/** Assigns a long-lived guest_id cookie on first visit if one isn't already present. */
export async function ensureGuestCookie(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  let guestId = request.cookies[env.GUEST_COOKIE_NAME];

  if (!guestId) {
    guestId = randomUUID();
    reply.setCookie(env.GUEST_COOKIE_NAME, guestId, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: env.GUEST_COOKIE_TTL_DAYS * 24 * 60 * 60,
    });
  }

  request.guestId = guestId;
}
