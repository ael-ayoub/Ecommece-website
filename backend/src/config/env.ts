import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // CORS — explicit single origin, no wildcard
  CORS_ORIGIN: z.string().url("CORS_ORIGIN must be a full origin URL, e.g. https://myshop.com"),

  // Admin JWT
  ADMIN_JWT_ACCESS_SECRET: z.string().min(32, "ADMIN_JWT_ACCESS_SECRET must be at least 32 chars"),
  ADMIN_JWT_ACCESS_TTL: z.string().default("15m"),
  ADMIN_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Customer session (Redis-backed)
  SESSION_COOKIE_NAME: z.string().default("session_id"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  GUEST_COOKIE_NAME: z.string().default("guest_id"),
  GUEST_COOKIE_TTL_DAYS: z.coerce.number().int().positive().default(365),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 chars"),
  COOKIE_SECURE: z.coerce.boolean().default(true),

  // OTP
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  // Mail
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().min(1).default("no-reply@example.com"),

  // Swagger — off by default, must be explicitly enabled
  SWAGGER_ENABLED: z.coerce.boolean().default(false),

  // Rate limiting
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_GLOBAL_WINDOW: z.string().default("1 minute"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
