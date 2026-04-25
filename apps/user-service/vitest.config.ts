import { defineConfig } from 'vitest/config';
 
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    isolate: true,
    reporters: ['verbose'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://2be7c2800a95225e499c10aeedb04c3df11bea77481a437c708eca92385d4721:sk_Vde2dtewO0s3pvYGtw71D@db.prisma.io:5432/postgres?sslmode=require',
      REDIS_URL: 'redis://localhost:6379',
      USER_SERVICE_PORT: '5002',
      CACHE_TTL_SECONDS: '60',
    },
  },
});
 