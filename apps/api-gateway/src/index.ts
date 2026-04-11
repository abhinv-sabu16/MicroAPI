import { buildServer } from './server.js';
import { env } from './config/env.js';

async function main(): Promise<void> {
  const server = await buildServer();

  try {
    await server.listen({ port: env.GATEWAY_PORT, host: env.GATEWAY_HOST });

    server.log.info(
      { port: env.GATEWAY_PORT, host: env.GATEWAY_HOST, environment: env.NODE_ENV },
      '🚀 API Gateway is ready',
    );
  } catch (err) {
    server.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown — drains in-flight requests before exit
  const shutdown = async (signal: string): Promise<void> => {
    server.log.info({ signal }, 'Shutdown signal received — draining requests...');
    try {
      await server.close();
      server.log.info('All connections closed. Goodbye.');
      process.exit(0);
    } catch (err) {
      server.log.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    server.log.fatal({ reason, promise }, 'Unhandled promise rejection — exiting');
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    server.log.fatal({ err: error }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

void main();