import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { adminOrdersService } from "./orders.service.js";
import type { listOrdersQuerySchema, updateOrderStatusBodySchema } from "./orders.schema.js";
import type { uuidParamSchema } from "../../../lib/common-schemas.js";

export const adminOrdersController = {
  async list(request: FastifyRequest<{ Querystring: z.infer<typeof listOrdersQuerySchema> }>, reply: FastifyReply) {
    const result = await adminOrdersService.list(request.query);
    return reply.send(result);
  },

  async getById(request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema> }>, reply: FastifyReply) {
    const order = await adminOrdersService.getById(request.params.id);
    return reply.send(order);
  },

  async updateStatus(
    request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema>; Body: z.infer<typeof updateOrderStatusBodySchema> }>,
    reply: FastifyReply,
  ) {
    const order = await adminOrdersService.updateStatus(request.admin!.id, request.params.id, request.body.status);
    return reply.send(order);
  },
};
