export class AppError extends Error {
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
export class ValidationError extends AppError {
    details;
    constructor(message, details) {
        super(message, 422, 'VALIDATION_ERROR');
        this.details = details;
    }
}
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_REQUIRED');
    }
}
export class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'FORBIDDEN');
    }
}
export class NotFoundError extends AppError {
    constructor(resource, id) {
        const msg = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(msg, 404, 'RESOURCE_NOT_FOUND');
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}
export class RateLimitError extends AppError {
    retryAfter;
    constructor(retryAfterSeconds = 60) {
        super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfterSeconds;
    }
}
export class ServiceUnavailableError extends AppError {
    constructor(service) {
        super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE', false);
    }
}
export function isOperationalError(error) {
    return error instanceof AppError && error.isOperational;
}
