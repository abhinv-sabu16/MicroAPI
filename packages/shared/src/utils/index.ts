import type { ApiResponse } from '../types/index.js';

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { status: 'success', data, message, timestamp: new Date().toISOString() };
}

export function errorResponse(code: string, message: string, requestId?: string): ApiResponse<never> {
  return { status: 'error', code, message, requestId, timestamp: new Date().toISOString() };
}

export async function attempt<T>(promise: Promise<T>): Promise<[Error, null] | [null, T]> {
  try {
    return [null, await promise];
  } catch (err) {
    return [err instanceof Error ? err : new Error(String(err)), null];
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function maskSensitive(
  obj: Record<string, unknown>,
  fields = ['password', 'token', 'secret', 'authorization', 'cookie'],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = fields.some((f) => key.toLowerCase().includes(f)) ? '[REDACTED]' : value;
  }
  return result;
}

export const isDevelopment = (): boolean => process.env['NODE_ENV'] === 'development';
export const isProduction  = (): boolean => process.env['NODE_ENV'] === 'production';
export const isTest        = (): boolean => process.env['NODE_ENV'] === 'test';
