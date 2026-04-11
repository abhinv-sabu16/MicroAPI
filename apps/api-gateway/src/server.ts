import crypto from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';

import { buildLoggerConfig } from './config/logger.js';
import { corsPlugin, helmetPlugin, requestContextPlugin, sensiblePlugin } from './plugins/index.js';
import { healthRoutes } from './routes/health.js';

/**
 * buildServer()
 *
 * Creates and fully configures the Fastify instance.
 * Separated from index.ts so it can be imported in tests
 * without binding to a port.
 *
 * Plugin registration order:
 *  1. sensible       — HTTP error helpers (no deps)
 *  2. helmet         — security headers (no deps)
 *  3. cors           — CORS policy (no deps)
 *  4. requestContext — request ID + timing (after logger ready)
 *  5. routes         — business logic (after all plugins)
 *
 * Future days add plugins here:
 *  Day 4  → jwt verification middleware
 *  Day 7  → proxy routes to upstream services
 *  Day 8  → rate limiting (Redis)
 *  Day 13 → Prometheus metrics
 *  Day 15 → OpenTelemetry tracing
 */
export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: buildLoggerConfig(),

    // Attach a unique UUID to every request for distributed tracing
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',

    // Trust X-Forwarded-For / X-Real-IP headers from Nginx
    // IMPORTANT: only set this if a trusted proxy sits in front!
    trustProxy: true,

    // Ajv options — used for JSON schema validation on route bodies
    ajv: {
      customOptions: {
        removeAdditional: true,  // strip unknown properties from input
        useDefaults: true,       // apply schema defaults
        coerceTypes: 'array',    // coerce query string types
        allErrors: true,         // return ALL validation errors, not just first
      },
    },
  });

  // ── Step 1: Core helpers ──────────────────────────────────────────────
  await server.register(sensiblePlugin);

  // ── Step 2: Security headers ──────────────────────────────────────────
  await server.register(helmetPlugin);

  // ── Step 3: CORS ─────────────────────────────────────────────────────
  await server.register(corsPlugin);

  // ── Step 4: Request context (IDs + timing) ───────────────────────────
  await server.register(requestContextPlugin);

  // ── Step 5: Routes ───────────────────────────────────────────────────
  await server.register(healthRoutes, { prefix: '' });

  // ── 404 handler ──────────────────────────────────────────────────────
  server.setNotFoundHandler((request, reply) => {
    request.log.warn({ method: request.method, url: request.url }, 'Route not found');
    void reply.code(404).send({
      status: 'error',
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Global error handler ──────────────────────────────────────────────
  server.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    const isServerError = statusCode >= 500;

    if (isServerError) {
      request.log.error({ err: error, requestId: request.requestId }, 'Unhandled server error');
    } else {
      request.log.warn({ err: error, requestId: request.requestId }, 'Request error');
    }

    const message =
      isServerError && process.env['NODE_ENV'] === 'production'
        ? 'Internal Server Error'
        : error.message;

    void reply.code(statusCode).send({
      status: 'error',
      code: error.code ?? (isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      ...(error.validation && { validation: error.validation }),
    });
  });

  return server;
}