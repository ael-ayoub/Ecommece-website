import path from "node:path";
import { ApiError } from "@/lib/errors";

export function normalizeStorageKey(input: string) {
  let decoded = input;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    throw new ApiError(400, "Invalid media path.");
  }

  if (
    !decoded ||
    decoded.includes("\0") ||
    decoded.includes("\\") ||
    path.posix.isAbsolute(decoded)
  ) {
    throw new ApiError(400, "Invalid media path.");
  }

  const segments = decoded.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new ApiError(400, "Invalid media path.");
  }
  return segments.join("/");
}

export function safeOriginalName(input: string) {
  const name = path.basename(input.replaceAll("\\", "/"));
  const normalized = name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._ -]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || "image").slice(0, 180);
}
