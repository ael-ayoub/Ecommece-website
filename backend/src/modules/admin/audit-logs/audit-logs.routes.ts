import type { FastifyInstance } from "fastify";
import { listAuditLogsQuerySchema } from "./audit-logs.schema.js";
import { adminAuditLogsController } from "./audit-logs.controller.js";
import { requireAdminAuth, requireAdminRole } from "../../../middleware/require-admin-auth.js";

export async function adminAuditLogsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminAuth);
  app.addHook("preHandler", requireAdminRole("SUPER_ADMIN"));

  app.get("/", { schema: { querystring: listAuditLogsQuerySchema, tags: ["admin-audit-logs"] } }, adminAuditLogsController.list);
}
