import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

import { env } from '../config/env.js';
import { pingRedis } from '../utils/redis.js';

export async function healthRoutes(
  server: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // GET /health — liveness probe
  server.get('/health', async (_request, reply) => {
    return reply.code(200).send({
      status: 'ok',
      service: 'api-gateway',
      version: process.env['npm_package_version'] ?? '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  });

  // GET /health/ready — readiness probe (checks Redis)
  server.get('/health/ready', async (_request, reply) => {
    const redisOk = await pingRedis();

    const checks = {
      redis: redisOk ? 'ok' : 'error',
    } as Record<string, string>;

    const hasError = Object.values(checks).some((v) => v === 'error');
    const status = hasError ? 'degraded' : 'ok';
    const code   = hasError ? 503 : 200;

    return reply.code(code).send({
      status,
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // GET /health/metrics — basic process stats
  server.get('/health/metrics', async (_request, reply) => {
    const mem = process.memoryUsage();
    return reply.code(200).send({
      timestamp: new Date().toISOString(),
      process: {
        uptime: Math.floor(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
      },
      memory: {
        heapUsedMb:  Math.round(mem.heapUsed  / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb:       Math.round(mem.rss       / 1024 / 1024),
      },
    });
  });
}