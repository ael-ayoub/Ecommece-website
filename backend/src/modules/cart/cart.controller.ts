import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { cartService } from "./cart.service.js";
import type { CartIdentity } from "./cart.repository.js";
import type { addCartItemBodySchema, updateCartItemBodySchema, cartItemParamsSchema } from "./cart.schema.js";

function identityFrom(request: FastifyRequest): CartIdentity {
  return { userId: request.user?.id, guestId: request.guestId };
}

export const cartController = {
  async get(request: FastifyRequest, reply: FastifyReply) {
    const cart = await cartService.getCart(identityFrom(request));
    return reply.send(cart);
  },

  async addItem(request: FastifyRequest<{ Body: z.infer<typeof addCartItemBodySchema> }>, reply: FastifyReply) {
    const cart = await cartService.addItem(identityFrom(request), request.body.product_id, request.body.quantity);
    return reply.send(cart);
  },

  async updateItem(
    request: FastifyRequest<{ Params: z.infer<typeof cartItemParamsSchema>; Body: z.infer<typeof updateCartItemBodySchema> }>,
    reply: FastifyReply,
  ) {
    const cart = await cartService.updateItem(identityFrom(request), request.params.itemId, request.body.quantity);
    return reply.send(cart);
  },

  async removeItem(request: FastifyRequest<{ Params: z.infer<typeof cartItemParamsSchema> }>, reply: FastifyReply) {
    const cart = await cartService.removeItem(identityFrom(request), request.params.itemId);
    return reply.send(cart);
  },

  async clear(request: FastifyRequest, reply: FastifyReply) {
    const cart = await cartService.clear(identityFrom(request));
    return reply.send(cart);
  },
};
