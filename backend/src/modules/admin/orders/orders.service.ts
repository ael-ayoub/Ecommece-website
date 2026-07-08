import { prisma } from "../../../lib/prisma-client.js";
import { adminOrdersRepository, type ListOrdersFilter } from "./orders.repository.js";
import { serializeOrder } from "../../../lib/serializers.js";
import { recordAuditLog } from "../../../lib/audit.js";
import { applyStatusTransitionStock } from "../../../lib/order-stock.js";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import { ORDER_STATUS_TRANSITIONS } from "../../../config/constants.js";
import { paginationMeta } from "../../../lib/common-schemas.js";
import type { OrderStatus } from "../../../generated/prisma/client.js";

export const adminOrdersService = {
  async list(filter: ListOrdersFilter) {
    const { items, total } = await adminOrdersRepository.list(filter);
    return { items: items.map(serializeOrder), meta: paginationMeta(filter.page, filter.pageSize, total) };
  },

  async getById(id: string) {
    const order = await adminOrdersRepository.findById(id);
    if (!order) throw new NotFoundError("Order not found");
    return serializeOrder(order);
  },

  async updateStatus(adminId: string, id: string, newStatus: OrderStatus) {
    const order = await adminOrdersRepository.findById(id);
    if (!order) throw new NotFoundError("Order not found");

    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new ConflictError(`Cannot transition order from ${order.status} to ${newStatus}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await applyStatusTransitionStock(
        tx,
        order.items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        order.status,
        newStatus,
      );
      return tx.order.update({ where: { id }, data: { status: newStatus }, include: { items: true } });
    });

    await recordAuditLog({
      adminId,
      action: "order.status_updated",
      entityType: "order",
      entityId: id,
      before: { status: order.status },
      after: { status: updated.status },
    });

    return serializeOrder(updated);
  },
};
