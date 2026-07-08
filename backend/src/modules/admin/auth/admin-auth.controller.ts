import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../../config/env.js";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "../../../config/constants.js";
import { adminAuthService } from "./admin-auth.service.js";
import type {
  adminLoginBodySchema,
  adminVerifyOtpBodySchema,
  adminForgotPasswordBodySchema,
  adminResetPasswordBodySchema,
} from "./admin-auth.schema.js";
import type { z } from "zod";

function setAdminAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string, refreshExpiresAt: Date) {
  reply.setCookie(ADMIN_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
  });
  reply.setCookie(ADMIN_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    path: "/api/v1/admin/auth",
    expires: refreshExpiresAt,
  });
}

function clearAdminAuthCookies(reply: FastifyReply) {
  reply.clearCookie(ADMIN_ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(ADMIN_REFRESH_COOKIE, { path: "/api/v1/admin/auth" });
}

export const adminAuthController = {
  async login(request: FastifyRequest<{ Body: z.infer<typeof adminLoginBodySchema> }>, reply: FastifyReply) {
    await adminAuthService.login(request.body.email, request.body.password);
    return reply.send({ message: "If the credentials are valid, a verification code has been sent." });
  },

  async verifyOtp(request: FastifyRequest<{ Body: z.infer<typeof adminVerifyOtpBodySchema> }>, reply: FastifyReply) {
    const result = await adminAuthService.verifyOtp(request.body.email, request.body.code);
    setAdminAuthCookies(reply, result.accessToken, result.refreshToken, result.refreshExpiresAt);
    return reply.send({ admin: result.admin });
  },

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies[ADMIN_REFRESH_COOKIE];
    if (!refreshToken) return reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Missing refresh token" } });

    const result = await adminAuthService.refresh(refreshToken);
    setAdminAuthCookies(reply, result.accessToken, result.refreshToken, result.refreshExpiresAt);
    return reply.send({ message: "Token refreshed" });
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies[ADMIN_REFRESH_COOKIE];
    await adminAuthService.logout(refreshToken);
    clearAdminAuthCookies(reply);
    return reply.send({ message: "Logged out" });
  },

  async forgotPassword(request: FastifyRequest<{ Body: z.infer<typeof adminForgotPasswordBodySchema> }>, reply: FastifyReply) {
    await adminAuthService.forgotPassword(request.body.email);
    return reply.send({ message: "If the email exists, a reset code has been sent." });
  },

  async resetPassword(request: FastifyRequest<{ Body: z.infer<typeof adminResetPasswordBodySchema> }>, reply: FastifyReply) {
    await adminAuthService.resetPassword(request.body.email, request.body.code, request.body.newPassword);
    return reply.send({ message: "Password reset successfully. Please log in again." });
  },
};
