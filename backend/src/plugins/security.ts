import fp from "fastify-plugin";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { redis } from "../lib/redis-client.js";

/** CORS, Helmet, and the global rate-limit baseline. Auth/OTP routes add stricter per-route limits on top. */
export const securityPlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(helmet, {
    global: true,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN, // explicit single origin — never a wildcard
    credentials: true,
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: env.RATE_LIMIT_GLOBAL_WINDOW,
    redis,
    keyGenerator: (req) => req.ip,
  });
});
