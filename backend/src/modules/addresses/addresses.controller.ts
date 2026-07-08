import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { addressesService } from "./addresses.service.js";
import type { createAddressBodySchema, updateAddressBodySchema } from "./addresses.schema.js";
import type { uuidParamSchema } from "../../lib/common-schemas.js";

export const addressesController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const items = await addressesService.list(request.user!.id);
    return reply.send({ items });
  },

  async create(request: FastifyRequest<{ Body: z.infer<typeof createAddressBodySchema> }>, reply: FastifyReply) {
    const address = await addressesService.create(request.user!.id, request.body);
    return reply.status(201).send(address);
  },

  async update(
    request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema>; Body: z.infer<typeof updateAddressBodySchema> }>,
    reply: FastifyReply,
  ) {
    const address = await addressesService.update(request.user!.id, request.params.id, request.body);
    return reply.send(address);
  },

  async remove(request: FastifyRequest<{ Params: z.infer<typeof uuidParamSchema> }>, reply: FastifyReply) {
    const result = await addressesService.remove(request.user!.id, request.params.id);
    return reply.send(result);
  },
};
