import type { FastifyInstance } from "fastify";
import {
  adminLoginBodySchema,
  adminVerifyOtpBodySchema,
  adminForgotPasswordBodySchema,
  adminResetPasswordBodySchema,
  adminAuthMessageResponseSchema,
  adminSessionResponseSchema,
} from "./admin-auth.schema.js";
import { adminAuthController } from "./admin-auth.controller.js";
import { OTP_REQUEST_RATE_LIMIT, AUTH_ROUTE_RATE_LIMIT } from "../../../config/constants.js";
import { requireAdminAuth } from "../../../middleware/require-admin-auth.js";

const otpKeyGenerator = (req: { body?: unknown; ip: string }) => {
  const body = req.body as { email?: string } | undefined;
  return `${body?.email ?? "unknown"}:${req.ip}`;
};

export async function adminAuthRoutes(app: FastifyInstance) {

  app.post(
    "/login",
    {
      schema: { body: adminLoginBodySchema, response: { 200: adminAuthMessageResponseSchema }, tags: ["admin-auth"] },
      config: {
        rateLimit: {
          max: OTP_REQUEST_RATE_LIMIT.max,
          timeWindow: OTP_REQUEST_RATE_LIMIT.timeWindowMs,
          keyGenerator: otpKeyGenerator,
          // Body isn't parsed yet at the default 'onRequest' stage — move the check to
          // 'preHandler' so otpKeyGenerator can actually read req.body.email.
          hook: "preHandler",
        },
      },
    },
    adminAuthController.login,
  );

  app.post(
    "/verify-otp",
    {
      schema: { body: adminVerifyOtpBodySchema, response: { 200: adminSessionResponseSchema }, tags: ["admin-auth"] },
      config: {
        rateLimit: {
          max: OTP_REQUEST_RATE_LIMIT.max,
          timeWindow: OTP_REQUEST_RATE_LIMIT.timeWindowMs,
          keyGenerator: otpKeyGenerator,
          // Body isn't parsed yet at the default 'onRequest' stage — move the check to
          // 'preHandler' so otpKeyGenerator can actually read req.body.email.
          hook: "preHandler",
        },
      },
    },
    adminAuthController.verifyOtp,
  );

  // Lets the SPA restore the logged-in admin's identity after a page refresh — the
  // access-token cookie survives, but nothing else about "who is logged in" is stored client-side.
  app.get(
    "/me",
    { schema: { response: { 200: adminSessionResponseSchema }, tags: ["admin-auth"] }, preHandler: [requireAdminAuth] },
    adminAuthController.me,
  );

  app.post(
    "/refresh",
    {
      schema: { response: { 200: adminAuthMessageResponseSchema }, tags: ["admin-auth"] },
      config: { rateLimit: { max: AUTH_ROUTE_RATE_LIMIT.max, timeWindow: AUTH_ROUTE_RATE_LIMIT.timeWindowMs } },
    },
    adminAuthController.refresh,
  );

  app.post(
    "/logout",
    { schema: { response: { 200: adminAuthMessageResponseSchema }, tags: ["admin-auth"] } },
    adminAuthController.logout,
  );

  app.post(
    "/forgot-password",
    {
      schema: { body: adminForgotPasswordBodySchema, response: { 200: adminAuthMessageResponseSchema }, tags: ["admin-auth"] },
      config: {
        rateLimit: {
          max: OTP_REQUEST_RATE_LIMIT.max,
          timeWindow: OTP_REQUEST_RATE_LIMIT.timeWindowMs,
          keyGenerator: otpKeyGenerator,
          // Body isn't parsed yet at the default 'onRequest' stage — move the check to
          // 'preHandler' so otpKeyGenerator can actually read req.body.email.
          hook: "preHandler",
        },
      },
    },
    adminAuthController.forgotPassword,
  );

  app.post(
    "/reset-password",
    {
      schema: { body: adminResetPasswordBodySchema, response: { 200: adminAuthMessageResponseSchema }, tags: ["admin-auth"] },
      config: {
        rateLimit: {
          max: OTP_REQUEST_RATE_LIMIT.max,
          timeWindow: OTP_REQUEST_RATE_LIMIT.timeWindowMs,
          keyGenerator: otpKeyGenerator,
          // Body isn't parsed yet at the default 'onRequest' stage — move the check to
          // 'preHandler' so otpKeyGenerator can actually read req.body.email.
          hook: "preHandler",
        },
      },
    },
    adminAuthController.resetPassword,
  );
}
