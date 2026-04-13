// Auth Service — stub
// Full JWT implementation: Day 4
import Fastify from 'fastify';

const PORT = Number(process.env['AUTH_SERVICE_PORT'] ?? 5001);

const server = Fastify({
  logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
});

server.get('/health', async () => ({
  status: 'ok',
  service: 'auth-service',
  timestamp: new Date().toISOString(),
}));

try {
  await server.listen({ port: PORT, host: '0.0.0.0' });
  server.log.info(`Auth service stub running on :${PORT}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
