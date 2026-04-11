import { z } from 'zod';
export interface ApiResponse<T = unknown> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    code?: string;
    requestId?: string;
    timestamp: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type PaginationQuery = z.infer<typeof PaginationSchema>;
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
    jti: string;
}
export interface RefreshTokenPayload {
    sub: string;
    jti: string;
    iat: number;
    exp: number;
}
export declare const UserRole: {
    readonly ADMIN: "admin";
    readonly USER: "user";
    readonly READONLY: "readonly";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export interface UserDto {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
}
export type HealthStatus = 'ok' | 'degraded' | 'error';
export interface ServiceHealth {
    status: HealthStatus;
    service: string;
    version: string;
    environment: string;
    timestamp: string;
    uptime: number;
    checks?: Record<string, HealthStatus | string>;
}
export interface DomainEvent<T = unknown> {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    payload: T;
    metadata: {
        correlationId?: string;
        causationId?: string;
        userId?: string;
        timestamp: string;
        version: number;
    };
}
export interface AuthenticatedRequest {
    user: JwtPayload;
    requestId: string;
}
export interface ServiceContext {
    requestId: string;
    correlationId: string;
    traceId?: string;
    userId?: string;
}
