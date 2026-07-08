import { z } from "zod";

export const adminLoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const adminVerifyOtpBodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const adminForgotPasswordBodySchema = z.object({
  email: z.string().email(),
});

export const adminResetPasswordBodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

export const adminAuthMessageResponseSchema = z.object({
  message: z.string(),
});

export const adminSessionResponseSchema = z.object({
  admin: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(["SUPER_ADMIN", "STAFF"]),
  }),
});
