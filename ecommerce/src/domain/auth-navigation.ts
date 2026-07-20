export function safeReturnPath(
  requested: string | null,
  fallback: string,
): string {
  if (
    !requested ||
    !requested.startsWith("/") ||
    requested.startsWith("//") ||
    requested.includes("\\") ||
    requested.includes("\0")
  ) {
    return fallback;
  }
  try {
    const parsed = new URL(requested, "http://local");
    return parsed.origin === "http://local"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
