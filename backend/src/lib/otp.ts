import { randomInt } from "node:crypto";

/** 6-digit numeric OTP, e.g. "042817" — sent by email, never a link. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
