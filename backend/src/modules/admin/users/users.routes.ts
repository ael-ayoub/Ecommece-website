import type { FastifyInstance } from "fastify";
import { listUsersQuerySchema, toggleUserDisabledBodySchema } from "./users.schema.js";
import { uuidParamSchema } from "../../../lib/common-schemas.js";
import { adminUsersController } from "./users.controller.js";
import { requireAdminAuth } from "../../../middleware/require-admin-auth.js";

export async function adminUsersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminAuth);

  app.get("/", { schema: { querystring: listUsersQuerySchema, tags: ["admin-users"] } }, adminUsersController.list);
  app.get("/:id", { schema: { params: uuidParamSchema, tags: ["admin-users"] } }, adminUsersController.getById);
  app.patch(
    "/:id/disabled",
    { schema: { params: uuidParamSchema, body: toggleUserDisabledBodySchema, tags: ["admin-users"] } },
    adminUsersController.setDisabled,
  );
}
