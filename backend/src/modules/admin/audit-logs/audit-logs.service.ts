import { adminAuditLogsRepository, type ListAuditLogsFilter } from "./audit-logs.repository.js";
import { paginationMeta } from "../../../lib/common-schemas.js";

export const adminAuditLogsService = {
  async list(filter: ListAuditLogsFilter) {
    const { items, total } = await adminAuditLogsRepository.list(filter);
    return {
      items: items.map((log) => ({
        id: log.id,
        admin_id: log.admin_id,
        admin_email: log.admin.email,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        before_value: log.before_value,
        after_value: log.after_value,
        created_at: log.created_at,
      })),
      meta: paginationMeta(filter.page, filter.pageSize, total),
    };
  },
};
