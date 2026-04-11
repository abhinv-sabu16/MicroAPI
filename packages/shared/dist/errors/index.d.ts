/**
 * Base application error — all custom errors extend this.
 * Preserves the original stack trace and adds HTTP semantics.
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, isOperational?: boolean);
}
export declare class ValidationError extends AppError {
    readonly details: unknown;
    constructor(message: string, details?: unknown);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id?: string | number);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class RateLimitError extends AppError {
    readonly retryAfter: number;
    constructor(retryAfterSeconds?: number);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(service: string);
}
/** Type guard for operational errors (expected) vs programmer errors (bugs) */
export declare function isOperationalError(error: unknown): error is AppError;
