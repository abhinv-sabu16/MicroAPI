import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const envPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.env",
);
dotenv.config({ path: envPath });

/**
 * Validates all environment variables at startup.
 * The app will CRASH LOUDLY if any required variable is missing or malformed —
 * better to fail at boot than to surface cryptic errors at runtime.
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  GATEWAY_PORT: z.coerce.number().int().min(1024).max(65535).default(5000),
  GATEWAY_HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  CORS_ORIGINS: z.string().optional(),

  // JWT (required — no defaults for secrets)
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_TOKEN_TTL: z.string().default("15m"),
  JWT_REFRESH_TOKEN_TTL: z.string().default("7d"),

  // Redis
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  REDIS_PASSWORD: z.string().optional(),

  // Upstream services
  AUTH_SERVICE_URL: z.string().url().default("http://localhost:5001"),
  USER_SERVICE_URL: z.string().url().default("http://localhost:5002"),
  NOTIFICATION_SERVICE_URL: z.string().url().default("http://localhost:5003"),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
});

function parseEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    result.error.issues.forEach((issue: any) => {
      console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
    });
    console.error("\nSee .env.example for required variables.\n");

    // During tests, we want to avoid exiting the process so vitest can finish.
    // We provide a set of safe fallback defaults.
    if (process.env["NODE_ENV"] === "test") {
      console.warn(
        "⚠️ Environment validation failed during tests. Using fallback test values.",
      );
      return {
        NODE_ENV: "test",
        GATEWAY_PORT: 5000,
        GATEWAY_HOST: "0.0.0.0",
        LOG_LEVEL: "info",
        JWT_SECRET: "test-secret-at-least-32-characters-long",
        JWT_ACCESS_TOKEN_TTL: "15m",
        JWT_REFRESH_TOKEN_TTL: "7d",
        REDIS_URL: "redis://localhost:6379",
        AUTH_SERVICE_URL: "http://localhost:5001",
        USER_SERVICE_URL: "http://localhost:5002",
        NOTIFICATION_SERVICE_URL: "http://localhost:5003",
        RATE_LIMIT_MAX: 100,
        RATE_LIMIT_WINDOW_MS: 60000,
        CORS_ORIGINS: "http://localhost:3000",
      } as any;
    }
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;
