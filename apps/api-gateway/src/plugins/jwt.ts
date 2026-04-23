import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import type { JwtUser } from '../types/jwt.js';

export const jwtPlugin = fp(
  async (server: FastifyInstance): Promise<void> => {

    function extractAndVerify(request: FastifyRequest): JwtUser | null {
      const authHeader = request.headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) return null;
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, env.JWT_SECRET, {
          issuer: 'auth-service',
          audience: 'api-gateway',
        }) as JwtUser;
        if (payload.type !== 'access') return null;
        return payload;
      } catch {
        return null;
      }
    }

    const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const authHeader = request.headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({ status: 'error', code: 'MISSING_TOKEN', message: 'Authorization header with Bearer token is required', requestId: request.requestId });
      }
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, env.JWT_SECRET, { issuer: 'auth-service', audience: 'api-gateway' }) as JwtUser;
        if (payload.type !== 'access') {
          return reply.code(401).send({ status: 'error', code: 'INVALID_TOKEN_TYPE', message: 'Invalid token type', requestId: request.requestId });
        }
        request.user = payload;
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          return reply.code(401).send({ status: 'error', code: 'TOKEN_EXPIRED', message: 'Access token has expired', requestId: request.requestId });
        }
        return reply.code(401).send({ status: 'error', code: 'INVALID_TOKEN', message: 'Access token is invalid', requestId: request.requestId });
      }
    };

    const optionalAuthenticate = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      request.user = extractAndVerify(request) ?? undefined;
    };

    const requireRole = (...roles: Array<'admin' | 'user' | 'readonly'>) =>
      async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        if (!request.user) {
          return reply.code(401).send({ status: 'error', code: 'MISSING_TOKEN', message: 'Authentication required', requestId: request.requestId });
        }
        if (!roles.includes(request.user.role)) {
          return reply.code(403).send({ status: 'error', code: 'FORBIDDEN', message: `Requires role: ${roles.join(', ')}`, requestId: request.requestId });
        }
      };

    server.decorate('authenticate', authenticate);
    server.decorate('optionalAuthenticate', optionalAuthenticate);
    server.decorate('requireRole', requireRole);
    server.log.info('JWT authentication plugin registered');
  },
  { name: 'jwt-plugin', fastify: '4.x', dependencies: ['request-context-plugin'] },
);

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: Array<'admin' | 'user' | 'readonly'>) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
