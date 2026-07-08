import type { FastifyInstance } from "fastify";
import { listOrdersQuerySchema, updateOrderStatusBodySchema } from "./orders.schema.js";
import { uuidParamSchema } from "../../../lib/common-schemas.js";
import { adminOrdersController } from "./orders.controller.js";
import { requireAdminAuth } from "../../../middleware/require-admin-auth.js";

export async function adminOrdersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminAuth);

  app.get("/", { schema: { querystring: listOrdersQuerySchema, tags: ["admin-orders"] } }, adminOrdersController.list);
  app.get("/:id", { schema: { params: uuidParamSchema, tags: ["admin-orders"] } }, adminOrdersController.getById);
  app.put(
    "/:id/status",
    { schema: { params: uuidParamSchema, body: updateOrderStatusBodySchema, tags: ["admin-orders"] } },
    adminOrdersController.updateStatus,
  );
}
