import { env } from "../../../config/env.js";
import { hashSecret, verifySecret } from "../../../lib/hash.js";
import { generateOtpCode } from "../../../lib/otp.js";
import { sendMail, otpEmail, passwordResetEmail } from "../../../lib/mailer.js";
import { issueAdminRefreshToken, signAdminAccessToken, verifyAdminRefreshToken } from "../../../lib/tokens.js";
import { UnauthorizedError, TooManyAttemptsError } from "../../../lib/errors.js";
import { adminAuthRepository } from "./admin-auth.repository.js";

const otpExpiry = () => new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

export const adminAuthService = {
  /** Step 1: verify email+password, email an OTP. Never issues tokens here. */
  async login(email: string, password: string): Promise<void> {
    const admin = await adminAuthRepository.findByEmail(email);
    // Same generic error whether the account doesn't exist or the password is wrong — avoids user enumeration.
    if (!admin || admin.is_disabled) throw new UnauthorizedError("Invalid email or password");

    const validPassword = await verifySecret(admin.password_hash, password);
    if (!validPassword) throw new UnauthorizedError("Invalid email or password");

    await adminAuthRepository.invalidateOtpCodes(admin.id);
    const code = generateOtpCode();
    const codeHash = await hashSecret(code);
    await adminAuthRepository.createOtpCode(admin.id, codeHash, otpExpiry());

    const { subject, text, html } = otpEmail(code);
    await sendMail({ to: admin.email, subject, text, html });
  },

  /** Step 2: verify the emailed OTP, issue access + refresh tokens. Every new login requires this — a valid refresh token never skips it. */
  async verifyOtp(email: string, code: string): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date; admin: { id: string; email: string; role: "SUPER_ADMIN" | "STAFF" } }> {
    const admin = await adminAuthRepository.findByEmail(email);
    if (!admin || admin.is_disabled) throw new UnauthorizedError("Invalid or expired code");

    const otp = await adminAuthRepository.findActiveOtpCode(admin.id);
    if (!otp) throw new UnauthorizedError("No active code — request a new one");

    if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
      await adminAuthRepository.invalidateOtpCodes(admin.id);
      throw new TooManyAttemptsError("Too many attempts — request a new code");
    }

    const validCode = await verifySecret(otp.code_hash, code);
    if (!validCode) {
      await adminAuthRepository.incrementOtpAttempts(otp.id);
      throw new UnauthorizedError("Invalid or expired code");
    }

    await adminAuthRepository.invalidateOtpCodes(admin.id);

    const accessToken = signAdminAccessToken({ sub: admin.id, role: admin.role });
    const { token: refreshToken, jti, expiresAt } = issueAdminRefreshToken(admin.id);
    const tokenHash = await hashSecret(jti);
    await adminAuthRepository.createRefreshToken(admin.id, tokenHash, expiresAt);

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    };
  },

  /** Rotates the refresh token. Detects reuse of an already-revoked token (a sign of theft) and revokes the whole session family. */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date }> {
    let payload;
    try {
      payload = verifyAdminRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const admin = await adminAuthRepository.findById(payload.sub);
    if (!admin || admin.is_disabled) throw new UnauthorizedError("Invalid refresh token");

    const activeTokens = await adminAuthRepository.findActiveRefreshTokens(admin.id);
    let matched = null;
    for (const row of activeTokens) {
      if (await verifySecret(row.token_hash, payload.jti)) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      const revokedTokens = await adminAuthRepository.findRevokedRefreshTokens(admin.id);
      for (const row of revokedTokens) {
        if (await verifySecret(row.token_hash, payload.jti)) {
          // This exact token was already rotated out once before — reuse detected, kill every session.
          await adminAuthRepository.revokeAllRefreshTokens(admin.id);
          throw new UnauthorizedError("Session invalidated — please log in again");
        }
      }
      throw new UnauthorizedError("Invalid refresh token");
    }

    await adminAuthRepository.revokeRefreshToken(matched.id);

    const accessToken = signAdminAccessToken({ sub: admin.id, role: admin.role });
    const { token: newRefreshToken, jti, expiresAt } = issueAdminRefreshToken(admin.id);
    const tokenHash = await hashSecret(jti);
    await adminAuthRepository.createRefreshToken(admin.id, tokenHash, expiresAt);

    return { accessToken, refreshToken: newRefreshToken, refreshExpiresAt: expiresAt };
  },

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    let payload;
    try {
      payload = verifyAdminRefreshToken(refreshToken);
    } catch {
      return;
    }
    const activeTokens = await adminAuthRepository.findActiveRefreshTokens(payload.sub);
    for (const row of activeTokens) {
      if (await verifySecret(row.token_hash, payload.jti)) {
        await adminAuthRepository.revokeRefreshToken(row.id);
        break;
      }
    }
  },

  /** Always responds the same way regardless of whether the email exists — avoids user enumeration. */
  async forgotPassword(email: string): Promise<void> {
    const admin = await adminAuthRepository.findByEmail(email);
    if (!admin || admin.is_disabled) return;

    await adminAuthRepository.invalidatePasswordResets(admin.id);
    const code = generateOtpCode();
    const codeHash = await hashSecret(code);
    await adminAuthRepository.createPasswordReset(admin.id, codeHash, otpExpiry());

    const { subject, text, html } = passwordResetEmail(code);
    await sendMail({ to: admin.email, subject, text, html });
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const admin = await adminAuthRepository.findByEmail(email);
    if (!admin) throw new UnauthorizedError("Invalid or expired code");

    const reset = await adminAuthRepository.findActivePasswordReset(admin.id);
    if (!reset) throw new UnauthorizedError("Invalid or expired code");

    const validCode = await verifySecret(reset.code_hash, code);
    if (!validCode) throw new UnauthorizedError("Invalid or expired code");

    await adminAuthRepository.markPasswordResetUsed(reset.id);
    const passwordHash = await hashSecret(newPassword);
    await adminAuthRepository.updatePasswordHash(admin.id, passwordHash);

    // Password change invalidates every active session.
    await adminAuthRepository.revokeAllRefreshTokens(admin.id);
    await adminAuthRepository.invalidateOtpCodes(admin.id);
  },
};
