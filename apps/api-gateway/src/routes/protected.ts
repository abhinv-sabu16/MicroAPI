import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

export async function protectedRoutes(
  server: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  server.get('/api/v1/profile',
    { onRequest: [server.authenticate] },
    async (request, reply) => {
      return reply.code(200).send({
        status: 'success',
        data: { id: request.user!.sub, email: request.user!.email, name: request.user!.name, role: request.user!.role },
        requestId: request.requestId,
      });
    },
  );

  server.get('/api/v1/admin',
    { onRequest: [server.authenticate, server.requireRole('admin')] },
    async (request, reply) => {
      return reply.code(200).send({
        status: 'success',
        data: { message: 'Welcome to the admin area', user: request.user!.email },
        requestId: request.requestId,
      });
    },
  );

  server.get('/api/v1/public',
    { onRequest: [server.optionalAuthenticate] },
    async (request, reply) => {
      return reply.code(200).send({
        status: 'success',
        data: {
          message: request.user ? `Hello, ${request.user.name}!` : 'Hello, anonymous!',
          authenticated: !!request.user,
        },
        requestId: request.requestId,
      });
    },
  );
}
