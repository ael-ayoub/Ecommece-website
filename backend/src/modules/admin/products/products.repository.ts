import { prisma } from "../../../lib/prisma-client.js";
import type { Prisma } from "../../../generated/prisma/client.js";

export interface ListProductsFilter {
  page: number;
  pageSize: number;
  category_id?: string;
  q?: string;
  include_deleted: boolean;
}

export const adminProductsRepository = {
  async list(filter: ListProductsFilter) {
    const where: Prisma.ProductWhereInput = {
      is_deleted: filter.include_deleted ? undefined : false,
      category_id: filter.category_id,
      name: filter.q ? { contains: filter.q, mode: "insensitive" } : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.product.findFirst({ where: { id, is_deleted: false } });
  },

  findByIdIncludingDeleted(id: string) {
    return prisma.product.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug } });
  },

  create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data });
  },

  update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.product.update({ where: { id }, data: { is_deleted: true, is_enabled: false } });
  },

  hasOrderItems(id: string) {
    return prisma.orderItem.count({ where: { product_id: id } }).then((count) => count > 0);
  },
};
