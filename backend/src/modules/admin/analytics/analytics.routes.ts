import type { FastifyInstance } from "fastify";
import { dateRangeQuerySchema } from "./analytics.schema.js";
import { adminAnalyticsController } from "./analytics.controller.js";
import { requireAdminAuth } from "../../../middleware/require-admin-auth.js";

export async function adminAnalyticsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminAuth);

  app.get("/summary", { schema: { tags: ["admin-analytics"] } }, adminAnalyticsController.summary);
  app.get("/profit", { schema: { querystring: dateRangeQuerySchema, tags: ["admin-analytics"] } }, adminAnalyticsController.profit);
  app.get("/returns", { schema: { tags: ["admin-analytics"] } }, adminAnalyticsController.returns);
}
