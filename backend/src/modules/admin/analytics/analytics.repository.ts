import { prisma } from "../../../lib/prisma-client.js";
import type { Prisma } from "../../../generated/prisma/client.js";

const NOT_CANCELLED: Prisma.OrderWhereInput = { status: { not: "CANCELLED" } };

export const adminAnalyticsRepository = {
  async revenueSince(since: Date) {
    const result = await prisma.order.aggregate({
      where: { ...NOT_CANCELLED, created_at: { gte: since } },
      _sum: { total_amount: true, delivery_cost: true },
      _count: true,
    });
    return {
      revenue: Number(result._sum.total_amount ?? 0) + Number(result._sum.delivery_cost ?? 0),
      orderCount: result._count,
    };
  },

  async deliveredOrderItems(dateFrom?: Date, dateTo?: Date) {
    return prisma.orderItem.findMany({
      where: {
        order: {
          status: "DELIVERED",
          created_at: dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined,
        },
      },
      select: { quantity: true, unit_price: true, unit_cost_price: true, order_id: true },
    });
  },

  async deliveredOrdersDeliveryCost(dateFrom?: Date, dateTo?: Date) {
    const result = await prisma.order.aggregate({
      where: { status: "DELIVERED", created_at: dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined },
      _sum: { delivery_cost: true },
    });
    return Number(result._sum.delivery_cost ?? 0);
  },

  async returnCounts() {
    const [pending, completed] = await Promise.all([
      prisma.order.count({ where: { status: "RETURN_REQUESTED" } }),
      prisma.order.count({ where: { status: "RETURNED" } }),
    ]);
    return { pending, completed };
  },
};
