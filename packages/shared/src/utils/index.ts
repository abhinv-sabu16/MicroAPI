import type { ApiResponse, PaginatedResponse, PaginationQuery } from '../types/index.js';

// ── API response builders ──────────────────────────────────────────────────

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    status: 'success',
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(
  code: string,
  message: string,
  requestId?: string,
): ApiResponse<never> {
  return {
    status: 'error',
    code,
    message,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  query: PaginationQuery,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / query.limit);
  return {
    status: 'success',
    data,
    timestamp: new Date().toISOString(),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
}

// ── Async utilities ────────────────────────────────────────────────────────

/**
 * Wraps a promise and returns a [error, data] tuple — avoids try/catch boilerplate.
 * Usage: const [err, user] = await attempt(fetchUser(id));
 */
export async function attempt<T>(
  promise: Promise<T>,
): Promise<[Error, null] | [null, T]> {
  try {
    const data = await promise;
    return [null, data];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
}

/**
 * Sleep for N milliseconds — useful for retry back-off.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function up to `maxRetries` times with exponential back-off.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 100,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
      }
    }
  }
  throw lastError ?? new Error('withRetry: all attempts failed');
}

// ── String / ID utilities ──────────────────────────────────────────────────

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function generateEventId(): string {
  return crypto.randomUUID();
}

/**
 * Mask sensitive fields in objects for safe logging.
 * e.g. maskSensitive({ password: 'secret', email: 'a@b.com' })
 *      → { password: '***', email: 'a@b.com' }
 */
export function maskSensitive(
  obj: Record<string, unknown>,
  fields = ['password', 'token', 'secret', 'authorization', 'cookie'],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = fields.some((f) => key.toLowerCase().includes(f)) ? '***' : value;
  }
  return result;
}

// ── Validation utilities ───────────────────────────────────────────────────

export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ── Environment helpers ────────────────────────────────────────────────────

export const isDevelopment = (): boolean => process.env['NODE_ENV'] === 'development';
export const isProduction = (): boolean => process.env['NODE_ENV'] === 'production';
export const isTest = (): boolean => process.env['NODE_ENV'] === 'test';
