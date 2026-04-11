import type { ApiResponse, PaginatedResponse, PaginationQuery } from '../types/index.js';
export declare function successResponse<T>(data: T, message?: string): ApiResponse<T>;
export declare function errorResponse(code: string, message: string, requestId?: string): ApiResponse<never>;
export declare function paginatedResponse<T>(data: T[], total: number, query: PaginationQuery): PaginatedResponse<T>;
/**
 * Wraps a promise and returns a [error, data] tuple — avoids try/catch boilerplate.
 * Usage: const [err, user] = await attempt(fetchUser(id));
 */
export declare function attempt<T>(promise: Promise<T>): Promise<[Error, null] | [null, T]>;
/**
 * Sleep for N milliseconds — useful for retry back-off.
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retry a function up to `maxRetries` times with exponential back-off.
 */
export declare function withRetry<T>(fn: () => Promise<T>, maxRetries?: number, baseDelayMs?: number): Promise<T>;
export declare function generateRequestId(): string;
export declare function generateEventId(): string;
/**
 * Mask sensitive fields in objects for safe logging.
 * e.g. maskSensitive({ password: 'secret', email: 'a@b.com' })
 *      → { password: '***', email: 'a@b.com' }
 */
export declare function maskSensitive(obj: Record<string, unknown>, fields?: string[]): Record<string, unknown>;
export declare function isValidUUID(value: string): boolean;
export declare function isValidEmail(value: string): boolean;
export declare const isDevelopment: () => boolean;
export declare const isProduction: () => boolean;
export declare const isTest: () => boolean;
