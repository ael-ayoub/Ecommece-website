import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import { createOrderBodySchema, listMyOrdersQuerySchema } from "./orders.schema.js";
import { uuidParamSchema } from "../../lib/common-schemas.js";
import { ordersController } from "./orders.controller.js";
import { ensureGuestCookie } from "../../middleware/guest-cookie.js";
import { attachCustomerSession, requireCustomerAuth } from "../../middleware/require-customer-auth.js";

export async function ordersRoutes(app: FastifyInstance) {
  // Checkout allows guest or logged-in — only needs the guest cookie + optional session.
  app.post<{ Body: z.infer<typeof createOrderBodySchema> }>(
    "/checkout",
    { schema: { body: createOrderBodySchema, tags: ["orders"] }, preHandler: [ensureGuestCookie, attachCustomerSession] },
    ordersController.checkout,
  );

  // Order history requires an account — guests don't get a persisted order list.
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", requireCustomerAuth);

    protectedRoutes.get("/", { schema: { querystring: listMyOrdersQuerySchema, tags: ["orders"] } }, ordersController.listMine);
    protectedRoutes.get("/:id", { schema: { params: uuidParamSchema, tags: ["orders"] } }, ordersController.getMineById);
    protectedRoutes.post("/:id/cancel", { schema: { params: uuidParamSchema, tags: ["orders"] } }, ordersController.cancelMine);
  });
}
