import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { adminCategoriesService } from "./categories.service.js";
import type { createCategoryBodySchema, updateCategoryBodySchema, listCategoriesQuerySchema } from "./categories.schema.js";
import type { uuidParamSchema } from "../../../lib/common-schemas.js";

export const adminCategoriesController = {
  async list(request: FastifyRequest<{ Querystring: z.infer<typeof listCategoriesQuerySchema> }>, reply: FastifyReply) {
    const categories = await adminCategoriesService.list(request.query.include_deleted);
    return reply.send({ items: categories });
  },

  async getById(request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema> }>, reply: FastifyReply) {
    const category = await adminCategoriesService.getById(request.params.id);
    return reply.send(category);
  },

  async create(request: FastifyRequest<{ Body: z.infer<typeof createCategoryBodySchema> }>, reply: FastifyReply) {
    const category = await adminCategoriesService.create(request.admin!.id, request.body);
    return reply.status(201).send(category);
  },

  async update(
    request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema>; Body: z.infer<typeof updateCategoryBodySchema> }>,
    reply: FastifyReply,
  ) {
    const category = await adminCategoriesService.update(request.admin!.id, request.params.id, request.body);
    return reply.send(category);
  },

  async remove(request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema> }>, reply: FastifyReply) {
    const result = await adminCategoriesService.remove(request.admin!.id, request.params.id);
    return reply.send(result);
  },
};
