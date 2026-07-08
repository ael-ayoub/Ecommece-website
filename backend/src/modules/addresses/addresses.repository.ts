import { prisma } from "../../lib/prisma-client.js";
import type { Prisma } from "../../generated/prisma/client.js";

export const addressesRepository = {
  listForUser(userId: string) {
    return prisma.address.findMany({ where: { user_id: userId }, orderBy: { is_default: "desc" } });
  },

  findById(id: string) {
    return prisma.address.findUnique({ where: { id } });
  },

  create(userId: string, data: Omit<Prisma.AddressCreateInput, "user">) {
    return prisma.address.create({ data: { ...data, user: { connect: { id: userId } } } });
  },

  update(id: string, data: Prisma.AddressUpdateInput) {
    return prisma.address.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.address.delete({ where: { id } });
  },

  clearDefaultForUser(userId: string) {
    return prisma.address.updateMany({ where: { user_id: userId, is_default: true }, data: { is_default: false } });
  },
};
