import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  USER_SERVICE_PORT: z.coerce.number().int().default(5002),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CACHE_TTL_SECONDS: z.coerce.number().int().default(60),
});

function parseEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('\n❌ User service — invalid environment variables:\n');
    result.error.issues.forEach((i) => {
      console.error(`  • ${i.path.join('.')}: ${i.message}`);
    });
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;