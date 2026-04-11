"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
exports.isOperationalError = isOperationalError;
/**
 * Base application error — all custom errors extend this.
 * Preserves the original stack trace and adds HTTP semantics.
 */
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', isOperational = true) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    details;
    constructor(message, details) {
        super(message, 422, 'VALIDATION_ERROR');
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_REQUIRED');
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource, id) {
        const msg = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(msg, 404, 'RESOURCE_NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    retryAfter;
    constructor(retryAfterSeconds = 60) {
        super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfterSeconds;
    }
}
exports.RateLimitError = RateLimitError;
class ServiceUnavailableError extends AppError {
    constructor(service) {
        super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE', false);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
/** Type guard for operational errors (expected) vs programmer errors (bugs) */
function isOperationalError(error) {
    return error instanceof AppError && error.isOperational;
}
