import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { adminAnalyticsService } from "./analytics.service.js";
import type { dateRangeQuerySchema } from "./analytics.schema.js";

export const adminAnalyticsController = {
  async summary(_request: FastifyRequest, reply: FastifyReply) {
    const result = await adminAnalyticsService.summary();
    return reply.send(result);
  },

  async profit(request: FastifyRequest<{ Querystring: z.infer<typeof dateRangeQuerySchema> }>, reply: FastifyReply) {
    const result = await adminAnalyticsService.profit(request.query.date_from, request.query.date_to);
    return reply.send(result);
  },

  async returns(_request: FastifyRequest, reply: FastifyReply) {
    const result = await adminAnalyticsService.returns();
    return reply.send(result);
  },

  async salesByDay(_request: FastifyRequest, reply: FastifyReply) {
    const result = await adminAnalyticsService.salesByDay(7);
    return reply.send(result);
  },

  async inventoryHealth(_request: FastifyRequest, reply: FastifyReply) {
    const result = await adminAnalyticsService.inventoryHealth();
    return reply.send(result);
  },
};
