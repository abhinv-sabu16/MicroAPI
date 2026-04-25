import Fastify, { type FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';

import { env } from './config/env.js';
import { userRoutes }   from './routes/users.js';
import { healthRoutes } from './routes/health.js';

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
    },
    genReqId: () => crypto.randomUUID(),
  });

  await server.register(sensible);
  await server.register(healthRoutes);
  await server.register(userRoutes);

  server.setNotFoundHandler((_req, reply) => {
    void reply.code(404).send({ status: 'error', code: 'ROUTE_NOT_FOUND', message: 'Route not found' });
  });

  server.setErrorHandler((error, request, reply) => {
    const status = error.statusCode ?? 500;
    server.log.error({ err: error, reqId: request.id }, 'Unhandled error');

    // Handle Prisma unique constraint violation
    if ((error as { code?: string }).code === 'P2002') {
      return reply.code(409).send({ status: 'error', code: 'CONFLICT', message: 'A record with this value already exists' });
    }

    void reply.code(status).send({
      status: 'error',
      code: error.code ?? 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' && status >= 500 ? 'Internal Server Error' : error.message,
    });
  });

  return server;
}