import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { ordersService } from "./orders.service.js";
import { IDEMPOTENCY_HEADER } from "../../config/constants.js";
import { BadRequestError } from "../../lib/errors.js";
import type { createOrderBodySchema, listMyOrdersQuerySchema } from "./orders.schema.js";
import type { uuidParamSchema } from "../../lib/common-schemas.js";

export const ordersController = {
  async checkout(request: FastifyRequest<{ Body: z.infer<typeof createOrderBodySchema> }>, reply: FastifyReply) {
    const idempotencyKey = request.headers[IDEMPOTENCY_HEADER];
    if (!idempotencyKey || Array.isArray(idempotencyKey)) {
      throw new BadRequestError(`Missing required "${IDEMPOTENCY_HEADER}" header`);
    }

    const order = await ordersService.checkout(
      { userId: request.user?.id, guestId: request.guestId },
      idempotencyKey,
      request.body,
    );
    return reply.status(201).send(order);
  },

  async listMine(request: FastifyRequest<{ Querystring: z.infer<typeof listMyOrdersQuerySchema> }>, reply: FastifyReply) {
    const result = await ordersService.listMine(request.user!.id, request.query.page, request.query.pageSize);
    return reply.send(result);
  },

  async getMineById(request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema> }>, reply: FastifyReply) {
    const order = await ordersService.getMineById(request.user!.id, request.params.id);
    return reply.send(order);
  },

  async cancelMine(request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema> }>, reply: FastifyReply) {
    const order = await ordersService.cancelMine(request.user!.id, request.params.id);
    return reply.send(order);
  },
};
