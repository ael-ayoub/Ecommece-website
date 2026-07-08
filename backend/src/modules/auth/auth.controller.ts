import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { env } from "../../config/env.js";
import { authService } from "./auth.service.js";
import { authRepository } from "./auth.repository.js";
import { destroySession } from "../../lib/session.js";
import { UnauthorizedError } from "../../lib/errors.js";
import type { registerBodySchema, loginBodySchema, forgotPasswordBodySchema, resetPasswordBodySchema } from "./auth.schema.js";

function setSessionCookie(reply: FastifyReply, sessionId: string) {
  reply.setCookie(env.SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export const authController = {
  async register(request: FastifyRequest<{ Body: z.infer<typeof registerBodySchema> }>, reply: FastifyReply) {
    const { email, password, full_name, locale } = request.body;
    const result = await authService.register(email, password, full_name, locale, request.guestId);
    setSessionCookie(reply, result.sessionId);
    return reply.status(201).send({ user: result.user });
  },

  async login(request: FastifyRequest<{ Body: z.infer<typeof loginBodySchema> }>, reply: FastifyReply) {
    const result = await authService.login(request.body.email, request.body.password, request.guestId);
    setSessionCookie(reply, result.sessionId);
    return reply.send({ user: result.user });
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const sessionId = request.cookies[env.SESSION_COOKIE_NAME];
    if (sessionId) await destroySession(sessionId, request.user?.id);
    reply.clearCookie(env.SESSION_COOKIE_NAME, { path: "/" });
    return reply.send({ message: "Logged out" });
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError("Login required");
    const user = await authRepository.findById(request.user.id);
    if (!user) throw new UnauthorizedError("Login required");
    return reply.send({ id: user.id, email: user.email, full_name: user.full_name, locale: user.locale });
  },

  async forgotPassword(request: FastifyRequest<{ Body: z.infer<typeof forgotPasswordBodySchema> }>, reply: FastifyReply) {
    await authService.forgotPassword(request.body.email);
    return reply.send({ message: "If the email exists, a reset code has been sent." });
  },

  async resetPassword(request: FastifyRequest<{ Body: z.infer<typeof resetPasswordBodySchema> }>, reply: FastifyReply) {
    await authService.resetPassword(request.body.email, request.body.code, request.body.newPassword);
    return reply.send({ message: "Password reset successfully. Please log in again." });
  },
};
