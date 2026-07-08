import { env } from "../../config/env.js";
import { authRepository } from "./auth.repository.js";
import { cartRepository } from "../cart/cart.repository.js";
import { hashSecret, verifySecret } from "../../lib/hash.js";
import { generateOtpCode } from "../../lib/otp.js";
import { sendMail, passwordResetEmail } from "../../lib/mailer.js";
import { createSession, destroyAllSessionsForUser } from "../../lib/session.js";
import { ConflictError, UnauthorizedError } from "../../lib/errors.js";
import type { Locale } from "../../generated/prisma/client.js";

function serializeUser(user: { id: string; email: string | null; full_name: string; locale: Locale }) {
  return { id: user.id, email: user.email, full_name: user.full_name, locale: user.locale };
}

async function linkGuestDataToUser(userId: string, email: string, guestId: string | undefined) {
  await authRepository.linkGuestOrdersToUser(userId, email);
  if (guestId) await cartRepository.mergeGuestCartIntoUser(guestId, userId);
}

export const authService = {
  async register(email: string, password: string, fullName: string, locale: Locale, guestId: string | undefined) {
    const existing = await authRepository.findByEmail(email);
    if (existing) throw new ConflictError("An account with this email already exists");

    const passwordHash = await hashSecret(password);
    const user = await authRepository.create(email, passwordHash, fullName, locale);

    await linkGuestDataToUser(user.id, email, guestId);
    const sessionId = await createSession(user.id);

    return { sessionId, user: serializeUser(user) };
  },

  async login(email: string, password: string, guestId: string | undefined) {
    const user = await authRepository.findByEmail(email);
    if (!user || user.is_disabled || !user.password_hash) throw new UnauthorizedError("Invalid email or password");

    const validPassword = await verifySecret(user.password_hash, password);
    if (!validPassword) throw new UnauthorizedError("Invalid email or password");

    await linkGuestDataToUser(user.id, email, guestId);
    const sessionId = await createSession(user.id);

    return { sessionId, user: serializeUser(user) };
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email);
    if (!user || user.is_disabled) return; // same response either way — avoids user enumeration

    await authRepository.invalidatePasswordResets(user.id);
    const code = generateOtpCode();
    const codeHash = await hashSecret(code);
    const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);
    await authRepository.createPasswordReset(user.id, codeHash, expiresAt);

    const { subject, text, html } = passwordResetEmail(code);
    await sendMail({ to: email, subject, text, html });
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await authRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError("Invalid or expired code");

    const reset = await authRepository.findActivePasswordReset(user.id);
    if (!reset) throw new UnauthorizedError("Invalid or expired code");

    const validCode = await verifySecret(reset.code_hash, code);
    if (!validCode) throw new UnauthorizedError("Invalid or expired code");

    await authRepository.markPasswordResetUsed(reset.id);
    const passwordHash = await hashSecret(newPassword);
    await authRepository.updatePasswordHash(user.id, passwordHash);

    // Password change invalidates every active session.
    await destroyAllSessionsForUser(user.id);
  },
};
