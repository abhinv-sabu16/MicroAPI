import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    isolate: true,
    reporter: ['verbose'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-that-is-32-characters-long!!',
      JWT_ACCESS_TOKEN_TTL: '15m',
      JWT_REFRESH_TOKEN_TTL: '7d',
      REDIS_URL: 'redis://localhost:6379',
      AUTH_SERVICE_PORT: '5001',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});
