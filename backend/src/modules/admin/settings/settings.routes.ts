import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import { updateSettingsBodySchema } from "./settings.schema.js";
import { adminSettingsController } from "./settings.controller.js";
import { requireAdminAuth, requireAdminRole } from "../../../middleware/require-admin-auth.js";

export async function adminSettingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminAuth);

  app.get("/", { schema: { tags: ["admin-settings"] } }, adminSettingsController.get);
  app.put<{ Body: z.infer<typeof updateSettingsBodySchema> }>(
    "/",
    { schema: { body: updateSettingsBodySchema, tags: ["admin-settings"] }, preHandler: [requireAdminRole("SUPER_ADMIN")] },
    adminSettingsController.update,
  );
}
