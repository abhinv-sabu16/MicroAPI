import { env } from './env.js';

/**
 * Service Registry
 *
 * Maps URL prefixes to upstream service URLs.
 * Each entry defines:
 *   prefix      - the gateway route prefix to match
 *   upstream    - the target service base URL
 *   auth        - whether JWT authentication is required
 *   stripPrefix - whether to strip the prefix before forwarding
 *
 * Example:
 *   Client calls:  GET /api/v1/users
 *   Gateway strips /api/v1 and forwards: GET /users → user-service:5002
 */
export interface ServiceConfig {
  prefix: string;
  upstream: string;
  auth: boolean;
  description: string;
}

export const serviceRegistry: ServiceConfig[] = [
  {
    prefix: '/api/v1/auth',
    upstream: env.AUTH_SERVICE_URL,
    auth: false,          // auth routes are public (login, register)
    description: 'Authentication service',
  },
  {
    prefix: '/api/v1/users',
    upstream: env.USER_SERVICE_URL,
    auth: true,           // user CRUD requires JWT
    description: 'User management service',
  },
  {
    prefix: '/api/v1/notifications',
    upstream: env.NOTIFICATION_SERVICE_URL,
    auth: true,
    description: 'Notification service',
  },
];