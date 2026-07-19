import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";

interface Entry {
  count: number;
  resetAt: number;
}

const entries = new Map<string, Entry>();

export class RateLimitError extends ApiError {
  constructor(public retryAfter: number) {
    super(429, "Too many requests. Please try again later.");
  }
}

export function requestIp(req: NextRequest) {
  if (process.env.TRUST_PROXY === "true") {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  }
  return req.ip ?? "unknown";
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = entries.get(key);
  if (!entry || entry.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (entry.count >= limit) throw new RateLimitError(Math.ceil((entry.resetAt - now) / 1000));
  entry.count += 1;
}

export function resetRateLimits() {
  entries.clear();
}
