import type { FastifyInstance } from "fastify";
import { createCategoryBodySchema, updateCategoryBodySchema, listCategoriesQuerySchema } from "./categories.schema.js";
import { uuidParamSchema } from "../../../lib/common-schemas.js";
import { adminCategoriesController } from "./categories.controller.js";
import { requireAdminAuth } from "../../../middleware/require-admin-auth.js";

export async function adminCategoriesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminAuth);

  app.get("/", { schema: { querystring: listCategoriesQuerySchema, tags: ["admin-categories"] } }, adminCategoriesController.list);
  app.get("/:id", { schema: { params: uuidParamSchema, tags: ["admin-categories"] } }, adminCategoriesController.getById);
  app.post("/", { schema: { body: createCategoryBodySchema, tags: ["admin-categories"] } }, adminCategoriesController.create);
  app.put(
    "/:id",
    { schema: { params: uuidParamSchema, body: updateCategoryBodySchema, tags: ["admin-categories"] } },
    adminCategoriesController.update,
  );
  app.delete("/:id", { schema: { params: uuidParamSchema, tags: ["admin-categories"] } }, adminCategoriesController.remove);
}
