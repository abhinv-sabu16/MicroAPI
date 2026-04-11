/**
 * Vitest setup file.
 * Runs before any test file to ensure the environment is correctly configured.
 */
import { vi } from 'vitest';

// Set mandatory environment variables before any app code imports them
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-chars-long!!';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['CORS_ORIGINS'] = 'http://localhost:3000';

// Mock any global services here if needed
