import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import proxy from '@fastify/http-proxy';

import { serviceRegistry } from '../config/services.js';
import { env } from '../config/env.js';

/**
 * Proxy Plugin
 *
 * For each service in the registry:
 *  1. Optionally runs server.authenticate (if auth: true)
 *  2. Forwards the request to the upstream service
 *  3. Strips the /api/v1 prefix so upstream sees clean paths
 *     e.g. /api/v1/users → /users on user-service
 *  4. Injects tracing headers on every upstream call
 *
 * Error handling:
 *  - Upstream unreachable    → 503 Service Unavailable
 *  - Upstream timeout        → 504 Gateway Timeout
 *  - Upstream 4xx/5xx        → passed through as-is
 */
export const proxyPlugin = fp(
  async (server: FastifyInstance): Promise<void> => {
    for (const service of serviceRegistry) {
      // Strip /api/v1 prefix — upstream services don't know about it
      const rewritePrefix = service.prefix.replace('/api/v1', '');

      await server.register(proxy, {
        upstream: service.upstream,
        prefix: service.prefix,
        rewritePrefix,

        // Forward JWT auth guard if required
        preHandler: service.auth ? server.authenticate : undefined,

        // Inject tracing + auth headers on every upstream request
        replyOptions: {
          rewriteRequestHeaders: (request, headers) => ({
            ...headers,
            // Thread request/correlation IDs through for distributed tracing
            'x-request-id':    request.id as string,
            'x-correlation-id': (request.headers['x-correlation-id'] as string) ?? request.id,
            // Forward user info to upstream so services don't need to re-verify JWT
            'x-user-id':    request.user?.sub   ?? '',
            'x-user-email': request.user?.email ?? '',
            'x-user-role':  request.user?.role  ?? '',
            // Identify the gateway as the caller
            'x-forwarded-by': 'api-gateway',
          }),
          onError: (reply, error) => {
            // Upstream connection refused / unreachable
            const code = (error as unknown as NodeJS.ErrnoException).code;

            if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
              server.log.error(
                { upstream: service.upstream, prefix: service.prefix, err: error },
                'Upstream service unreachable',
              );
              void reply.code(503).send({
                status: 'error',
                code: 'SERVICE_UNAVAILABLE',
                message: `${service.description} is currently unavailable`,
              });
              return;
            }

            if (code === 'ETIMEDOUT' || code === 'ECONNRESET') {
              server.log.error(
                { upstream: service.upstream, prefix: service.prefix, err: error },
                'Upstream service timeout',
              );
              void reply.code(504).send({
                status: 'error',
                code: 'GATEWAY_TIMEOUT',
                message: `${service.description} did not respond in time`,
              });
              return;
            }

            // Unknown error — log and return 502
            server.log.error({ err: error, prefix: service.prefix }, 'Proxy error');
            void reply.code(502).send({
              status: 'error',
              code: 'BAD_GATEWAY',
              message: 'An error occurred while processing your request',
            });
          },
        },

        // Timeouts
        httpMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      });

      server.log.info(
        { prefix: service.prefix, upstream: service.upstream, auth: service.auth },
        `Proxy registered: ${service.prefix} → ${service.upstream}`,
      );
    }
  },
  {
    name: 'proxy-plugin',
    fastify: '4.x',
    dependencies: ['jwt-plugin'],
  },
);