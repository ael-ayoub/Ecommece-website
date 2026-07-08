import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { adminProductsService } from "./products.service.js";
import type {
  createProductBodySchema,
  updateProductBodySchema,
  updateStockBodySchema,
  toggleEnabledBodySchema,
  listProductsQuerySchema,
} from "./products.schema.js";
import type { uuidParamSchema } from "../../../lib/common-schemas.js";

export const adminProductsController = {
  async list(request: FastifyRequest<{ Querystring: z.infer<typeof listProductsQuerySchema> }>, reply: FastifyReply) {
    const result = await adminProductsService.list(request.query);
    return reply.send(result);
  },

  async getById(request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema> }>, reply: FastifyReply) {
    const product = await adminProductsService.getById(request.params.id);
    return reply.send(product);
  },

  async create(request: FastifyRequest<{ Body: z.infer<typeof createProductBodySchema> }>, reply: FastifyReply) {
    const product = await adminProductsService.create(request.admin!.id, request.body);
    return reply.status(201).send(product);
  },

  async update(
    request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema>; Body: z.infer<typeof updateProductBodySchema> }>,
    reply: FastifyReply,
  ) {
    const product = await adminProductsService.update(request.admin!.id, request.params.id, request.body);
    return reply.send(product);
  },

  async updateStock(
    request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema>; Body: z.infer<typeof updateStockBodySchema> }>,
    reply: FastifyReply,
  ) {
    const product = await adminProductsService.updateStock(request.admin!.id, request.params.id, request.body);
    return reply.send(product);
  },

  async toggleEnabled(
    request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema>; Body: z.infer<typeof toggleEnabledBodySchema> }>,
    reply: FastifyReply,
  ) {
    const product = await adminProductsService.toggleEnabled(request.admin!.id, request.params.id, request.body.is_enabled);
    return reply.send(product);
  },

  async remove(request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema> }>, reply: FastifyReply) {
    const result = await adminProductsService.remove(request.admin!.id, request.params.id);
    return reply.send(result);
  },
};
