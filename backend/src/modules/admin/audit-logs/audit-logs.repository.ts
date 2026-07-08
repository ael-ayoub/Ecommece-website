import { prisma } from "../../../lib/prisma-client.js";
import type { Prisma } from "../../../generated/prisma/client.js";

export interface ListAuditLogsFilter {
  page: number;
  pageSize: number;
  admin_id?: string;
  entity_type?: string;
  entity_id?: string;
}

export const adminAuditLogsRepository = {
  async list(filter: ListAuditLogsFilter) {
    const where: Prisma.AuditLogWhereInput = {
      admin_id: filter.admin_id,
      entity_type: filter.entity_type,
      entity_id: filter.entity_id,
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { admin: { select: { email: true } } },
        orderBy: { created_at: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  },
};
