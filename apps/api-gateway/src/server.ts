import Fastify, { type FastifyInstance } from 'fastify';

import { buildLoggerConfig } from './config/logger.js';
import {
  corsPlugin,
  helmetPlugin,
  jwtPlugin,
  proxyPlugin,
  rateLimitPlugin,
  requestContextPlugin,
  sensiblePlugin,
} from './plugins/index.js';
import { healthRoutes }    from './routes/health.js';
import { protectedRoutes } from './routes/protected.js';

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: buildLoggerConfig(),
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: true,
        useDefaults: true,
        coerceTypes: 'array',
        allErrors: true,
      },
    },
  });

  // ── Plugins (order matters) ────────────────────────────────────────────
  await server.register(sensiblePlugin);
  await server.register(helmetPlugin);
  await server.register(corsPlugin);
  await server.register(requestContextPlugin);
  await server.register(rateLimitPlugin);       // Day 8 — rate limiting
  await server.register(jwtPlugin);
  await server.register(proxyPlugin);

  // ── Gateway-level routes ──────────────────────────────────────────────
  await server.register(healthRoutes);
  await server.register(protectedRoutes);

  // ── 404 ───────────────────────────────────────────────────────────────
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
      request.log.error({ err: error, requestId: request.requestId }, 'Unhandled error');
    } else {
      request.log.warn({ err: error, requestId: request.requestId }, 'Request error');
    }

    void reply.code(statusCode).send({
      status: 'error',
      code: error.code ?? (isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message:
        isServerError && process.env['NODE_ENV'] === 'production'
          ? 'Internal Server Error'
          : error.message,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      ...(error.validation && { validation: error.validation }),
    });
  });

  return server;
}