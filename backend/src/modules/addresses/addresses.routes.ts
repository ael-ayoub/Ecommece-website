import type { FastifyInstance } from "fastify";
import { createAddressBodySchema, updateAddressBodySchema } from "./addresses.schema.js";
import { uuidParamSchema } from "../../lib/common-schemas.js";
import { addressesController } from "./addresses.controller.js";
import { requireCustomerAuth } from "../../middleware/require-customer-auth.js";

export async function addressesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireCustomerAuth);

  app.get("/", { schema: { tags: ["addresses"] } }, addressesController.list);
  app.post("/", { schema: { body: createAddressBodySchema, tags: ["addresses"] } }, addressesController.create);
  app.put(
    "/:id",
    { schema: { params: uuidParamSchema, body: updateAddressBodySchema, tags: ["addresses"] } },
    addressesController.update,
  );
  app.delete("/:id", { schema: { params: uuidParamSchema, tags: ["addresses"] } }, addressesController.remove);
}
