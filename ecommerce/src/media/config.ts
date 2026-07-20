const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function positiveInteger(name: string, fallback: number) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function publicPath(value: string) {
  const normalized = `/${value.trim().replace(/^\/+|\/+$/g, "")}`;
  if (
    normalized === "/" ||
    normalized.includes("..") ||
    normalized.includes("\\")
  ) {
    throw new Error("MEDIA_PUBLIC_PATH must be a safe URL path.");
  }
  return normalized;
}

export interface MediaConfig {
  driver: "local";
  localRoot: string;
  publicPath: string;
  publicBaseUrl: string;
  maxFileSizeBytes: number;
  maxImagesPerProduct: number;
  maxImagePixels: number;
  uploadRateLimitPerMinute: number;
  allowedMimeTypes: ReadonlySet<string>;
}

let cached: MediaConfig | undefined;

export function getMediaConfig(): MediaConfig {
  if (cached) return cached;

  const driver = process.env.MEDIA_STORAGE_DRIVER ?? "local";
  if (driver !== "local") {
    throw new Error(
      "MEDIA_STORAGE_DRIVER must be local until another storage adapter is installed.",
    );
  }

  const localRoot = process.env.MEDIA_LOCAL_ROOT ?? "/app/uploads";
  if (!localRoot.startsWith("/")) {
    throw new Error("MEDIA_LOCAL_ROOT must be an absolute path.");
  }

  const publicBaseUrl = (process.env.MEDIA_PUBLIC_BASE_URL ?? "").replace(
    /\/+$/,
    "",
  );
  if (publicBaseUrl) {
    const parsed = new URL(publicBaseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("MEDIA_PUBLIC_BASE_URL must use http or https.");
    }
  }

  const configuredTypes = (
    process.env.MEDIA_ALLOWED_MIME_TYPES ?? "image/jpeg,image/png,image/webp"
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (
    configuredTypes.length === 0 ||
    configuredTypes.some((value) => !SUPPORTED_MIME_TYPES.has(value))
  ) {
    throw new Error(
      "MEDIA_ALLOWED_MIME_TYPES may contain only image/jpeg, image/png, and image/webp.",
    );
  }

  cached = {
    driver,
    localRoot,
    publicPath: publicPath(process.env.MEDIA_PUBLIC_PATH ?? "/media"),
    publicBaseUrl,
    maxFileSizeBytes: positiveInteger(
      "MEDIA_MAX_FILE_SIZE_BYTES",
      5 * 1024 * 1024,
    ),
    maxImagesPerProduct: positiveInteger("MEDIA_MAX_IMAGES_PER_PRODUCT", 8),
    maxImagePixels: positiveInteger("MEDIA_MAX_IMAGE_PIXELS", 40_000_000),
    uploadRateLimitPerMinute: positiveInteger(
      "RATE_LIMIT_MEDIA_UPLOAD_MAX",
      30,
    ),
    allowedMimeTypes: new Set(configuredTypes),
  };
  return cached;
}

export function resetMediaConfigForTests() {
  cached = undefined;
}
