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
      JWT_SECRET: 'test-secret-that-is-32-characters-long!!',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGINS: '',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});