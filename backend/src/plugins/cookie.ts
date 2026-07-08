import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";

export const cookiePlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: "onRequest",
  });
});
