import { prisma } from "../../../lib/prisma-client.js";
import type { Admin } from "../../../generated/prisma/client.js";

export const adminAuthRepository = {
  findByEmail(email: string): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { email } });
  },

  findById(id: string): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { id } });
  },

  updatePasswordHash(adminId: string, passwordHash: string) {
    return prisma.admin.update({ where: { id: adminId }, data: { password_hash: passwordHash } });
  },

  // OTP codes (login step 2)
  invalidateOtpCodes(adminId: string) {
    return prisma.adminOtpCode.deleteMany({ where: { admin_id: adminId } });
  },

  createOtpCode(adminId: string, codeHash: string, expiresAt: Date) {
    return prisma.adminOtpCode.create({ data: { admin_id: adminId, code_hash: codeHash, expires_at: expiresAt } });
  },

  findActiveOtpCode(adminId: string) {
    return prisma.adminOtpCode.findFirst({
      where: { admin_id: adminId, expires_at: { gt: new Date() } },
      orderBy: { created_at: "desc" },
    });
  },

  incrementOtpAttempts(id: string) {
    return prisma.adminOtpCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
  },

  // Refresh tokens
  createRefreshToken(adminId: string, tokenHash: string, expiresAt: Date) {
    return prisma.adminRefreshToken.create({
      data: { admin_id: adminId, token_hash: tokenHash, expires_at: expiresAt },
    });
  },

  findActiveRefreshTokens(adminId: string) {
    return prisma.adminRefreshToken.findMany({
      where: { admin_id: adminId, revoked: false, expires_at: { gt: new Date() } },
    });
  },

  findRevokedRefreshTokens(adminId: string) {
    return prisma.adminRefreshToken.findMany({ where: { admin_id: adminId, revoked: true } });
  },

  revokeRefreshToken(id: string) {
    return prisma.adminRefreshToken.update({ where: { id }, data: { revoked: true } });
  },

  revokeAllRefreshTokens(adminId: string) {
    return prisma.adminRefreshToken.updateMany({ where: { admin_id: adminId }, data: { revoked: true } });
  },

  // Password resets
  invalidatePasswordResets(adminId: string) {
    return prisma.adminPasswordReset.deleteMany({ where: { admin_id: adminId } });
  },

  createPasswordReset(adminId: string, codeHash: string, expiresAt: Date) {
    return prisma.adminPasswordReset.create({
      data: { admin_id: adminId, code_hash: codeHash, expires_at: expiresAt },
    });
  },

  findActivePasswordReset(adminId: string) {
    return prisma.adminPasswordReset.findFirst({
      where: { admin_id: adminId, used_at: null, expires_at: { gt: new Date() } },
      orderBy: { expires_at: "desc" },
    });
  },

  markPasswordResetUsed(id: string) {
    return prisma.adminPasswordReset.update({ where: { id }, data: { used_at: new Date() } });
  },
};
