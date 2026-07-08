import { prisma } from "../../lib/prisma-client.js";

export const categoriesRepository = {
  listVisible() {
    return prisma.category.findMany({ where: { is_deleted: false }, orderBy: { name: "asc" } });
  },

  findBySlug(slug: string) {
    return prisma.category.findFirst({ where: { slug, is_deleted: false } });
  },
};
