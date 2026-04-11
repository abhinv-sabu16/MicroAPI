"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isProduction = exports.isDevelopment = void 0;
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.paginatedResponse = paginatedResponse;
exports.attempt = attempt;
exports.sleep = sleep;
exports.withRetry = withRetry;
exports.generateRequestId = generateRequestId;
exports.generateEventId = generateEventId;
exports.maskSensitive = maskSensitive;
exports.isValidUUID = isValidUUID;
exports.isValidEmail = isValidEmail;
// ── API response builders ──────────────────────────────────────────────────
function successResponse(data, message) {
    return {
        status: 'success',
        data,
        message,
        timestamp: new Date().toISOString(),
    };
}
function errorResponse(code, message, requestId) {
    return {
        status: 'error',
        code,
        message,
        requestId,
        timestamp: new Date().toISOString(),
    };
}
function paginatedResponse(data, total, query) {
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
async function attempt(promise) {
    try {
        const data = await promise;
        return [null, data];
    }
    catch (err) {
        return [err instanceof Error ? err : new Error(String(err)), null];
    }
}
/**
 * Sleep for N milliseconds — useful for retry back-off.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Retry a function up to `maxRetries` times with exponential back-off.
 */
async function withRetry(fn, maxRetries = 3, baseDelayMs = 100) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxRetries - 1) {
                await sleep(baseDelayMs * Math.pow(2, attempt));
            }
        }
    }
    throw lastError ?? new Error('withRetry: all attempts failed');
}
// ── String / ID utilities ──────────────────────────────────────────────────
function generateRequestId() {
    return crypto.randomUUID();
}
function generateEventId() {
    return crypto.randomUUID();
}
/**
 * Mask sensitive fields in objects for safe logging.
 * e.g. maskSensitive({ password: 'secret', email: 'a@b.com' })
 *      → { password: '***', email: 'a@b.com' }
 */
function maskSensitive(obj, fields = ['password', 'token', 'secret', 'authorization', 'cookie']) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = fields.some((f) => key.toLowerCase().includes(f)) ? '***' : value;
    }
    return result;
}
// ── Validation utilities ───────────────────────────────────────────────────
function isValidUUID(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
// ── Environment helpers ────────────────────────────────────────────────────
const isDevelopment = () => process.env['NODE_ENV'] === 'development';
exports.isDevelopment = isDevelopment;
const isProduction = () => process.env['NODE_ENV'] === 'production';
exports.isProduction = isProduction;
const isTest = () => process.env['NODE_ENV'] === 'test';
exports.isTest = isTest;
