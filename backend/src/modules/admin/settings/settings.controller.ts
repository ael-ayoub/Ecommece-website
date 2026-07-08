import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { adminSettingsService } from "./settings.service.js";
import type { updateSettingsBodySchema } from "./settings.schema.js";

export const adminSettingsController = {
  async get(_request: FastifyRequest, reply: FastifyReply) {
    const settings = await adminSettingsService.get();
    return reply.send(settings);
  },

  async update(request: FastifyRequest<{ Body: z.infer<typeof updateSettingsBodySchema> }>, reply: FastifyReply) {
    const settings = await adminSettingsService.update(request.admin!.id, request.body);
    return reply.send(settings);
  },
};
