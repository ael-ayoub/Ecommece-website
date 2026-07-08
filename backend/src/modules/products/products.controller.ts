import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { productsService } from "./products.service.js";
import type { listProductsQuerySchema, productParamsSchema } from "./products.schema.js";

export const productsController = {
  async list(request: FastifyRequest<{ Querystring: z.infer<typeof listProductsQuerySchema> }>, reply: FastifyReply) {
    const result = await productsService.list(request.query);
    return reply.send(result);
  },

  async getBySlug(request: FastifyRequest<{ Params: z.infer<typeof productParamsSchema> }>, reply: FastifyReply) {
    const product = await productsService.getBySlug(request.params.slug);
    return reply.send(product);
  },

  async related(request: FastifyRequest<{ Params: z.infer<typeof productParamsSchema> }>, reply: FastifyReply) {
    const items = await productsService.related(request.params.slug);
    return reply.send({ items });
  },
};
