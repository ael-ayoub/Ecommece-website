import { adminUsersRepository, type ListUsersFilter } from "./users.repository.js";
import { recordAuditLog } from "../../../lib/audit.js";
import { destroyAllSessionsForUser } from "../../../lib/session.js";
import { NotFoundError } from "../../../lib/errors.js";
import { paginationMeta } from "../../../lib/common-schemas.js";

function serializeUser(user: { id: string; email: string | null; full_name: string; locale: string; is_disabled: boolean; created_at: Date }) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    locale: user.locale,
    is_disabled: user.is_disabled,
    created_at: user.created_at,
  };
}

export const adminUsersService = {
  async list(filter: ListUsersFilter) {
    const { items, total } = await adminUsersRepository.list(filter);
    return { items: items.map(serializeUser), meta: paginationMeta(filter.page, filter.pageSize, total) };
  },

  async getById(id: string) {
    const user = await adminUsersRepository.findById(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  async setDisabled(adminId: string, id: string, isDisabled: boolean) {
    const before = await adminUsersRepository.findById(id);
    if (!before) throw new NotFoundError("User not found");

    const updated = await adminUsersRepository.setDisabled(id, isDisabled);

    // Disabling a user must take effect immediately — kill any active sessions.
    if (isDisabled) await destroyAllSessionsForUser(id);

    await recordAuditLog({
      adminId,
      action: isDisabled ? "user.disabled" : "user.enabled",
      entityType: "user",
      entityId: id,
      before: { is_disabled: before.is_disabled },
      after: { is_disabled: updated.is_disabled },
    });

    return serializeUser(updated);
  },
};
