// notification-service — stub. Kafka consumer wired: Day 11
import Fastify from 'fastify';

const server = Fastify({ logger: { level: process.env['LOG_LEVEL'] ?? 'info' } });

server.get('/health', async () => ({
  status: 'ok',
  service: 'notification-service',
  timestamp: new Date().toISOString(),
}));

try {
  await server.listen({ port: 5003, host: '0.0.0.0' });
  server.log.info('notification-service stub running on :5003');
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
