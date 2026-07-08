import { prisma } from "../../../lib/prisma-client.js";
import type { Prisma, OrderStatus } from "../../../generated/prisma/client.js";

export interface ListOrdersFilter {
  page: number;
  pageSize: number;
  status?: OrderStatus;
  date_from?: Date;
  date_to?: Date;
}

export const adminOrdersRepository = {
  async list(filter: ListOrdersFilter) {
    const where: Prisma.OrderWhereInput = {
      status: filter.status,
      created_at:
        filter.date_from || filter.date_to
          ? { gte: filter.date_from, lte: filter.date_to }
          : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { created_at: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: { items: true } });
  },
};
