import type { FastifyInstance } from 'fastify';
import { getPrisma } from '../utils/prisma.js';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', async (_request, reply) => {
    // Check DB connectivity
    let dbStatus: 'ok' | 'error' = 'ok';
    try {
      await getPrisma().$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    const status = dbStatus === 'ok' ? 'ok' : 'degraded';
    const code   = status === 'ok' ? 200 : 503;

    return reply.code(code).send({
      status,
      service: 'user-service',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: { database: dbStatus },
    });
  });
}