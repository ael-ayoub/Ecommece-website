import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { adminAuditLogsService } from "./audit-logs.service.js";
import type { listAuditLogsQuerySchema } from "./audit-logs.schema.js";

export const adminAuditLogsController = {
  async list(request: FastifyRequest<{ Querystring: z.infer<typeof listAuditLogsQuerySchema> }>, reply: FastifyReply) {
    const result = await adminAuditLogsService.list(request.query);
    return reply.send(result);
  },
};
