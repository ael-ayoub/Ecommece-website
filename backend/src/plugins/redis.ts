import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { Redis } from "ioredis";
import { redis } from "../lib/redis-client.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate("redis", redis);
  app.addHook("onClose", async () => {
    redis.disconnect();
  });
});
