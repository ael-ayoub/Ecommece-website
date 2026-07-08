import type { FastifyInstance } from "fastify";
import { categoryParamsSchema } from "./categories.schema.js";
import { categoriesController } from "./categories.controller.js";

export async function categoriesRoutes(app: FastifyInstance) {

  app.get("/", { schema: { tags: ["categories"] } }, categoriesController.list);
  app.get("/:slug", { schema: { params: categoryParamsSchema, tags: ["categories"] } }, categoriesController.getBySlug);
}
