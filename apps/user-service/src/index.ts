import { buildServer } from './server.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './utils/prisma.js';
import { closeCache } from './utils/cache.js';

async function main(): Promise<void> {
  const server = await buildServer();

  try {
    await server.listen({ port: env.USER_SERVICE_PORT, host: '0.0.0.0' });
    server.log.info({ port: env.USER_SERVICE_PORT }, '👤 User service ready');
  } catch (err) {
    server.log.error({ err }, 'Failed to start user service');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    server.log.info({ signal }, 'Shutting down...');
    await server.close();
    await disconnectPrisma();
    await closeCache();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    server.log.fatal({ reason }, 'Unhandled rejection');
    process.exit(1);
  });
}

void main();