import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { z } from 'zod';

/**
 * Gateway Validation Plugin
 *
 * Validates requests at the gateway layer BEFORE proxying to upstream.
 * This catches obviously malformed requests early — saving upstream
 * services from processing bad data.
 *
 * Validation rules applied per route prefix:
 *   /api/v1/auth/register  → RegisterBodySchema
 *   /api/v1/auth/login     → LoginBodySchema
 *   /api/v1/users (POST)   → CreateUserBodySchema
 *   /api/v1/users (PUT)    → UpdateUserBodySchema
 *
 * Upstream services do their own deeper validation too.
 * This is a belt-and-suspenders approach.
 */

// ── Schemas ────────────────────────────────────────────────────────────────

const RegisterBodySchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().min(1, 'Name is required').max(100),
});

const LoginBodySchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const CreateUserBodySchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().min(1, 'Name is required').max(100),
  role:     z.enum(['ADMIN', 'USER', 'READONLY']).optional(),
});

const UpdateUserBodySchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  role:     z.enum(['ADMIN', 'USER', 'READONLY']).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' },
);

// ── Route → Schema mapping ─────────────────────────────────────────────────

type RouteSchema = {
  path: string;
  method: string;
  schema: z.ZodTypeAny;
};

const routeSchemas: RouteSchema[] = [
  { path: '/api/v1/auth/register', method: 'POST', schema: RegisterBodySchema },
  { path: '/api/v1/auth/login',    method: 'POST', schema: LoginBodySchema },
  { path: '/api/v1/users',         method: 'POST', schema: CreateUserBodySchema },
];

function findSchema(url: string, method: string): z.ZodTypeAny | null {
  // Check exact match first
  const exact = routeSchemas.find(
    (r) => r.path === url && r.method === method,
  );
  if (exact) return exact.schema;

  // Check if URL starts with a registered path (handles query strings)
  const prefix = routeSchemas.find(
    (r) => url.startsWith(r.path) && r.method === method,
  );
  return prefix?.schema ?? null;
}

// ── Plugin ─────────────────────────────────────────────────────────────────

export const validationPlugin = fp(
  async (server: FastifyInstance): Promise<void> => {

    server.addHook('preHandler', async (request: FastifyRequest, reply) => {
      // Only validate requests with a body
      if (!['POST', 'PUT', 'PATCH'].includes(request.method)) return;
      if (!request.body || typeof request.body !== 'object') return;

      const schema = findSchema(request.url.split('?')[0] ?? '', request.method);
      if (!schema) return; // no schema registered for this route — pass through

      const result = schema.safeParse(request.body);
      if (!result.success) {
        return reply.code(422).send({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: result.error.flatten().fieldErrors,
          requestId: request.requestId,
          timestamp: new Date().toISOString(),
        });
      }

      // Replace body with parsed+coerced data
      request.body = result.data;
    });

    server.log.info(
      { routes: routeSchemas.map((r) => `${r.method} ${r.path}`) },
      'Gateway validation plugin registered',
    );
  },
  { name: 'validation-plugin', fastify: '4.x' },
);