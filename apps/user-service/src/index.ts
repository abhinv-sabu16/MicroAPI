// user-service — stub. Full Prisma + CRUD implementation: Day 6
import Fastify from 'fastify';

const server = Fastify({ logger: { level: process.env['LOG_LEVEL'] ?? 'info' } });

server.get('/health', async () => ({
  status: 'ok',
  service: 'user-service',
  timestamp: new Date().toISOString(),
}));

try {
  await server.listen({ port: 5002, host: '0.0.0.0' });
  server.log.info('user-service stub running on :5002');
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
