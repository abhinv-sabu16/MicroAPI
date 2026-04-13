export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
  requestId?: string;
  timestamp: string;
}

export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  READONLY: 'readonly',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  jti: string;
}

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
