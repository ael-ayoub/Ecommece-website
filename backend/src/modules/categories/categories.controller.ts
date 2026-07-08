import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { categoriesService } from "./categories.service.js";
import type { categoryParamsSchema } from "./categories.schema.js";

export const categoriesController = {
  async list(_request: FastifyRequest, reply: FastifyReply) {
    const items = await categoriesService.list();
    return reply.send({ items });
  },

  async getBySlug(request: FastifyRequest<{ Params: z.infer<typeof categoryParamsSchema> }>, reply: FastifyReply) {
    const category = await categoriesService.getBySlug(request.params.slug);
    return reply.send(category);
  },
};
