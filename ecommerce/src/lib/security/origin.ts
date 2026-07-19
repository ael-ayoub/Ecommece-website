import type { NextRequest } from "next/server";
import { ForbiddenError } from "@/lib/errors";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function assertSameOrigin(req: NextRequest) {
  if (!UNSAFE_METHODS.has(req.method) || !req.cookies.has("auth_token")) return;
  const allowed = new Set(
    [
      process.env.APP_ORIGIN,
      ...(process.env.ADDITIONAL_ALLOWED_ORIGINS ?? "").split(","),
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  if (allowed.size === 0 && process.env.NODE_ENV !== "production") {
    allowed.add(new URL(req.url).origin);
  }
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source) return;
  let origin: string;
  try {
    origin = new URL(source).origin;
  } catch {
    throw new ForbiddenError("Invalid request origin.");
  }
  if (!allowed.has(origin))
    throw new ForbiddenError("Cross-origin mutation rejected.");
}
