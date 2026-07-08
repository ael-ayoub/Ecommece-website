import type { FastifyInstance } from "fastify";
import { addCartItemBodySchema, updateCartItemBodySchema, cartItemParamsSchema } from "./cart.schema.js";
import { cartController } from "./cart.controller.js";
import { ensureGuestCookie } from "../../middleware/guest-cookie.js";
import { attachCustomerSession } from "../../middleware/require-customer-auth.js";

export async function cartRoutes(app: FastifyInstance) {
  app.addHook("preHandler", ensureGuestCookie);
  app.addHook("preHandler", attachCustomerSession);

  app.get("/", { schema: { tags: ["cart"] } }, cartController.get);
  app.post("/items", { schema: { body: addCartItemBodySchema, tags: ["cart"] } }, cartController.addItem);
  app.put(
    "/items/:itemId",
    { schema: { params: cartItemParamsSchema, body: updateCartItemBodySchema, tags: ["cart"] } },
    cartController.updateItem,
  );
  app.delete("/items/:itemId", { schema: { params: cartItemParamsSchema, tags: ["cart"] } }, cartController.removeItem);
  app.delete("/", { schema: { tags: ["cart"] } }, cartController.clear);
}
