import { prisma } from "../../../lib/prisma-client.js";
import type { Prisma } from "../../../generated/prisma/client.js";

export interface ListUsersFilter {
  page: number;
  pageSize: number;
  q?: string;
}

export const adminUsersRepository = {
  async list(filter: ListUsersFilter) {
    const where: Prisma.UserWhereInput = filter.q
      ? { OR: [{ email: { contains: filter.q, mode: "insensitive" } }, { full_name: { contains: filter.q, mode: "insensitive" } }] }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { orders: { orderBy: { created_at: "desc" }, take: 20 }, addresses: true },
    });
  },

  setDisabled(id: string, isDisabled: boolean) {
    return prisma.user.update({ where: { id }, data: { is_disabled: isDisabled } });
  },
};
