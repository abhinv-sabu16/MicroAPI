import type { FastifyInstance } from 'fastify';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', async (_request, reply) => {
    return reply.code(200).send({
      status: 'ok',
      service: 'auth-service',
      version: process.env['npm_package_version'] ?? '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  });
}
