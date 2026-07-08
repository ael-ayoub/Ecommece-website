import { prisma } from "./prisma-client.js";

interface RecordAuditInput {
  adminId: string;
  action: string; // e.g. "product.price_updated"
  entityType: string; // e.g. "product"
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export async function recordAuditLog({ adminId, action, entityType, entityId, before, after }: RecordAuditInput) {
  await prisma.auditLog.create({
    data: {
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      before_value: before === undefined ? undefined : (before as object),
      after_value: after === undefined ? undefined : (after as object),
    },
  });
}
