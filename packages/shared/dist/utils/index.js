export function successResponse(data, message) {
    return { status: 'success', data, message, timestamp: new Date().toISOString() };
}
export function errorResponse(code, message, requestId) {
    return { status: 'error', code, message, requestId, timestamp: new Date().toISOString() };
}
export async function attempt(promise) {
    try {
        return [null, await promise];
    }
    catch (err) {
        return [err instanceof Error ? err : new Error(String(err)), null];
    }
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function generateRequestId() {
    return crypto.randomUUID();
}
export function maskSensitive(obj, fields = ['password', 'token', 'secret', 'authorization', 'cookie']) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = fields.some((f) => key.toLowerCase().includes(f)) ? '[REDACTED]' : value;
    }
    return result;
}
export const isDevelopment = () => process.env['NODE_ENV'] === 'development';
export const isProduction = () => process.env['NODE_ENV'] === 'production';
export const isTest = () => process.env['NODE_ENV'] === 'test';
