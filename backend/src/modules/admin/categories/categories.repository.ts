import { prisma } from "../../../lib/prisma-client.js";
import type { Prisma } from "../../../generated/prisma/client.js";

export const adminCategoriesRepository = {
  list(includeDeleted: boolean) {
    return prisma.category.findMany({
      where: includeDeleted ? {} : { is_deleted: false },
      orderBy: { name: "asc" },
    });
  },

  findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
  },

  create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  },

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.category.update({ where: { id }, data: { is_deleted: true } });
  },

  countProductsInCategory(id: string) {
    return prisma.product.count({ where: { category_id: id, is_deleted: false } });
  },

  countChildren(id: string) {
    return prisma.category.count({ where: { parent_id: id, is_deleted: false } });
  },
};
