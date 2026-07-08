import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false, // MailHog/MailDev in dev, and most self-hosted SMTP relays, use STARTTLS or plaintext
  auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
});

interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail({ to, subject, text, html }: SendMailInput): Promise<void> {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

export function otpEmail(code: string): { subject: string; text: string; html: string } {
  return {
    subject: "Your verification code",
    text: `Your verification code is ${code}. It expires shortly. If you did not request this, ignore this email.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires shortly. If you did not request this, ignore this email.</p>`,
  };
}

export function passwordResetEmail(code: string): { subject: string; text: string; html: string } {
  return {
    subject: "Password reset code",
    text: `Your password reset code is ${code}. If you did not request this, ignore this email.`,
    html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>If you did not request this, ignore this email.</p>`,
  };
}
