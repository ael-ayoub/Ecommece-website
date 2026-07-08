import { prisma } from "../../lib/prisma-client.js";
import type { Locale } from "../../generated/prisma/client.js";

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(email: string, passwordHash: string, fullName: string, locale: Locale) {
    return prisma.user.create({ data: { email, password_hash: passwordHash, full_name: fullName, locale } });
  },

  updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { password_hash: passwordHash } });
  },

  /** Attaches any guest orders placed under this email to the now-known account. */
  linkGuestOrdersToUser(userId: string, email: string) {
    return prisma.order.updateMany({ where: { guest_email: email, user_id: null }, data: { user_id: userId } });
  },

  invalidatePasswordResets(userId: string) {
    return prisma.passwordReset.deleteMany({ where: { user_id: userId } });
  },

  createPasswordReset(userId: string, codeHash: string, expiresAt: Date) {
    return prisma.passwordReset.create({ data: { user_id: userId, code_hash: codeHash, expires_at: expiresAt } });
  },

  findActivePasswordReset(userId: string) {
    return prisma.passwordReset.findFirst({
      where: { user_id: userId, used_at: null, expires_at: { gt: new Date() } },
      orderBy: { expires_at: "desc" },
    });
  },

  markPasswordResetUsed(id: string) {
    return prisma.passwordReset.update({ where: { id }, data: { used_at: new Date() } });
  },
};
