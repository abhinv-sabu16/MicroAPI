import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

import { env } from '../config/env.js';

export const rateLimitPlugin = fp(
  async (server: FastifyInstance): Promise<void> => {
    await server.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW_MS,

      keyGenerator: (request: FastifyRequest) => {
        return (
          (request.headers['x-forwarded-for'] as string | undefined)
            ?.split(',')[0]
            ?.trim() ?? request.ip
        );
      },

      allowList: (request: FastifyRequest) => {
        return ['/health', '/health/ready', '/health/metrics'].includes(request.url);
      },

      errorResponseBuilder: (request: FastifyRequest, context: { max: number; ttl: number }) => ({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Limit: ${context.max} per ${Math.floor(context.ttl / 1000)}s.`,
        retryAfter: Math.ceil(context.ttl / 1000),
        requestId: request.id,
      }),

      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true,
      },
    });

    server.log.info(
      { max: env.RATE_LIMIT_MAX, windowMs: env.RATE_LIMIT_WINDOW_MS, store: 'memory' },
      'Rate limit plugin registered',
    );
  },
  { name: 'rate-limit-plugin', fastify: '4.x' },
);
