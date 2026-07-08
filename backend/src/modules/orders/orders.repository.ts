import { prisma } from "../../lib/prisma-client.js";
import type { Prisma } from "../../generated/prisma/client.js";

export const ordersRepository = {
  findByIdempotencyKey(key: string) {
    return prisma.order.findUnique({ where: { idempotency_key: key }, include: { items: true } });
  },

  create(tx: Prisma.TransactionClient, data: Prisma.OrderCreateInput) {
    return tx.order.create({ data, include: { items: true } });
  },

  findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: { items: true } });
  },

  async listForUser(userId: string, page: number, pageSize: number) {
    const where: Prisma.OrderWhereInput = { user_id: userId };
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  },

  updateStatus(tx: Prisma.TransactionClient, id: string, status: Prisma.OrderUpdateInput["status"]) {
    return tx.order.update({ where: { id }, data: { status }, include: { items: true } });
  },
};
