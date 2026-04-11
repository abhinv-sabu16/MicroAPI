"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
/**
 * Validates all environment variables at startup.
 * The app will CRASH LOUDLY if any required variable is missing or malformed —
 * better to fail at boot than to surface cryptic errors at runtime.
 */
const envSchema = zod_1.z.object({
    // Server
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    GATEWAY_PORT: zod_1.z.coerce.number().int().min(1024).max(65535).default(5000),
    GATEWAY_HOST: zod_1.z.string().default('0.0.0.0'),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    // JWT (required — no defaults for secrets)
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_ACCESS_TOKEN_TTL: zod_1.z.string().default('15m'),
    JWT_REFRESH_TOKEN_TTL: zod_1.z.string().default('7d'),
    // Redis
    REDIS_URL: zod_1.z.string().url().default('redis://localhost:6379'),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    // Upstream services
    AUTH_SERVICE_URL: zod_1.z.string().url().default('http://localhost:5001'),
    USER_SERVICE_URL: zod_1.z.string().url().default('http://localhost:5002'),
    NOTIFICATION_SERVICE_URL: zod_1.z.string().url().default('http://localhost:5003'),
    // Rate limiting
    RATE_LIMIT_MAX: zod_1.z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().int().positive().default(60_000),
});
function parseEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        result.error.issues.forEach((issue) => {
            console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
        });
        console.error('\nSee .env.example for required variables.\n');
        process.exit(1);
    }
    return result.data;
}
exports.env = parseEnv();
