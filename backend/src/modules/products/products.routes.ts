import type { FastifyInstance } from "fastify";
import { listProductsQuerySchema, productParamsSchema } from "./products.schema.js";
import { productsController } from "./products.controller.js";

export async function productsRoutes(app: FastifyInstance) {

  app.get("/", { schema: { querystring: listProductsQuerySchema, tags: ["products"] } }, productsController.list);
  app.get("/:slug", { schema: { params: productParamsSchema, tags: ["products"] } }, productsController.getBySlug);
  app.get("/:slug/related", { schema: { params: productParamsSchema, tags: ["products"] } }, productsController.related);
}
