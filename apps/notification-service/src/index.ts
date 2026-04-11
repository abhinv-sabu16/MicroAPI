import fastify from 'fastify';

const server = fastify({ logger: true });

server.get('/health', async () => {
  return { status: 'ok', service: 'notification-service' };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
