import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { adminUsersService } from "./users.service.js";
import type { listUsersQuerySchema, toggleUserDisabledBodySchema } from "./users.schema.js";
import type { uuidParamSchema } from "../../../lib/common-schemas.js";

export const adminUsersController = {
  async list(request: FastifyRequest<{ Querystring: z.infer<typeof listUsersQuerySchema> }>, reply: FastifyReply) {
    const result = await adminUsersService.list(request.query);
    return reply.send(result);
  },

  async getById(request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema> }>, reply: FastifyReply) {
    const user = await adminUsersService.getById(request.params.id);
    return reply.send(user);
  },

  async setDisabled(
    request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema>; Body: z.infer<typeof toggleUserDisabledBodySchema> }>,
    reply: FastifyReply,
  ) {
    const user = await adminUsersService.setDisabled(request.admin!.id, request.params.id, request.body.is_disabled);
    return reply.send(user);
  },
};
