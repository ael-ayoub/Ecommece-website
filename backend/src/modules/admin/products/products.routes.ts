import type { FastifyInstance } from "fastify";
import {
  createProductBodySchema,
  updateProductBodySchema,
  updateStockBodySchema,
  toggleEnabledBodySchema,
  listProductsQuerySchema,
} from "./products.schema.js";
import { uuidParamSchema } from "../../../lib/common-schemas.js";
import { adminProductsController } from "./products.controller.js";
import { requireAdminAuth } from "../../../middleware/require-admin-auth.js";

export async function adminProductsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminAuth);

  app.get("/", { schema: { querystring: listProductsQuerySchema, tags: ["admin-products"] } }, adminProductsController.list);
  app.get("/:id", { schema: { params: uuidParamSchema, tags: ["admin-products"] } }, adminProductsController.getById);
  app.post("/", { schema: { body: createProductBodySchema, tags: ["admin-products"] } }, adminProductsController.create);
  app.put(
    "/:id",
    { schema: { params: uuidParamSchema, body: updateProductBodySchema, tags: ["admin-products"] } },
    adminProductsController.update,
  );
  app.patch(
    "/:id/stock",
    { schema: { params: uuidParamSchema, body: updateStockBodySchema, tags: ["admin-products"] } },
    adminProductsController.updateStock,
  );
  app.patch(
    "/:id/toggle-enabled",
    { schema: { params: uuidParamSchema, body: toggleEnabledBodySchema, tags: ["admin-products"] } },
    adminProductsController.toggleEnabled,
  );
  app.delete("/:id", { schema: { params: uuidParamSchema, tags: ["admin-products"] } }, adminProductsController.remove);
}
