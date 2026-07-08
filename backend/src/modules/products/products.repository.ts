import { prisma } from "../../lib/prisma-client.js";
import type { Prisma } from "../../generated/prisma/client.js";

export interface PublicProductFilter {
  page: number;
  pageSize: number;
  category_slug?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  sort: "newest" | "price_asc" | "price_desc";
}

const orderByFor: Record<PublicProductFilter["sort"], Prisma.ProductOrderByWithRelationInput> = {
  newest: { created_at: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
};

export const productsRepository = {
  async list(filter: PublicProductFilter) {
    const where: Prisma.ProductWhereInput = {
      is_deleted: false,
      is_enabled: true,
      category: filter.category_slug ? { slug: filter.category_slug } : undefined,
      name: filter.q ? { contains: filter.q, mode: "insensitive" } : undefined,
      price:
        filter.min_price !== undefined || filter.max_price !== undefined
          ? { gte: filter.min_price, lte: filter.max_price }
          : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: orderByFor[filter.sort],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  },

  findVisibleBySlug(slug: string) {
    return prisma.product.findFirst({ where: { slug, is_deleted: false, is_enabled: true } });
  },

  findVisibleById(id: string) {
    return prisma.product.findFirst({ where: { id, is_deleted: false, is_enabled: true } });
  },

  findRelated(categoryId: string, excludeId: string, limit: number) {
    return prisma.product.findMany({
      where: { category_id: categoryId, is_deleted: false, is_enabled: true, id: { not: excludeId } },
      take: limit,
    });
  },
};
