import type { FastifyInstance } from "fastify";
import { registerBodySchema, loginBodySchema, forgotPasswordBodySchema, resetPasswordBodySchema } from "./auth.schema.js";
import { authController } from "./auth.controller.js";
import { ensureGuestCookie } from "../../middleware/guest-cookie.js";
import { attachCustomerSession } from "../../middleware/require-customer-auth.js";
import { AUTH_ROUTE_RATE_LIMIT, OTP_REQUEST_RATE_LIMIT } from "../../config/constants.js";

export async function authRoutes(app: FastifyInstance) {
  app.addHook("preHandler", ensureGuestCookie);
  app.addHook("preHandler", attachCustomerSession);

  app.post(
    "/register",
    {
      schema: { body: registerBodySchema, tags: ["auth"] },
      config: { rateLimit: { max: AUTH_ROUTE_RATE_LIMIT.max, timeWindow: AUTH_ROUTE_RATE_LIMIT.timeWindowMs } },
    },
    authController.register,
  );

  app.post(
    "/login",
    {
      schema: { body: loginBodySchema, tags: ["auth"] },
      config: { rateLimit: { max: AUTH_ROUTE_RATE_LIMIT.max, timeWindow: AUTH_ROUTE_RATE_LIMIT.timeWindowMs } },
    },
    authController.login,
  );

  app.post("/logout", { schema: { tags: ["auth"] } }, authController.logout);
  app.get("/me", { schema: { tags: ["auth"] } }, authController.me);

  app.post(
    "/forgot-password",
    {
      schema: { body: forgotPasswordBodySchema, tags: ["auth"] },
      config: { rateLimit: { max: OTP_REQUEST_RATE_LIMIT.max, timeWindow: OTP_REQUEST_RATE_LIMIT.timeWindowMs } },
    },
    authController.forgotPassword,
  );

  app.post(
    "/reset-password",
    {
      schema: { body: resetPasswordBodySchema, tags: ["auth"] },
      config: { rateLimit: { max: OTP_REQUEST_RATE_LIMIT.max, timeWindow: OTP_REQUEST_RATE_LIMIT.timeWindowMs } },
    },
    authController.resetPassword,
  );
}
