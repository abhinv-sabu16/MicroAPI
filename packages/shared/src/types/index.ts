import { z } from 'zod';

// ── API response envelope ──────────────────────────────────────────────────

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

// ── Pagination query params ────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationQuery = z.infer<typeof PaginationSchema>;

// ── JWT payload ────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;       // user ID
  email: string;
  role: UserRole;
  iat: number;       // issued at
  exp: number;       // expires at
  jti: string;       // JWT ID (for revocation)
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

// ── User domain ────────────────────────────────────────────────────────────

export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  READONLY: 'readonly',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// ── Service health ────────────────────────────────────────────────────────

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

// ── Kafka message envelope ─────────────────────────────────────────────────

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

// ── Request augmentation ───────────────────────────────────────────────────

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
