import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyPluginAsync } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import { env } from "../config/env.js";

/** Gated behind SWAGGER_ENABLED — off by default, must be explicitly enabled (never in prod by accident). */
export const swaggerPlugin: FastifyPluginAsync = fp(async (app) => {
  if (!env.SWAGGER_ENABLED) return;

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Ecommerce API",
        version: "1.0.0",
      },
      servers: [{ url: "/api/v1" }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: "/api/v1/docs",
  });
});
