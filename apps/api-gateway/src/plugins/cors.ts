import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { env } from '../config/env.js';

/**
 * CORS Plugin
 *
 * Development  → allow all origins (permissive for local dev)
 * Production   → strict allowlist from CORS_ORIGINS env var
 *
 * Registered with fastify-plugin (fp) so it is NOT encapsulated —
 * the CORS headers apply to every route in the app.
 */
export const corsPlugin = fp(
  async (server: FastifyInstance): Promise<void> => {
    const allowedOrigins = env.CORS_ORIGINS
      ? env.CORS_ORIGINS.split(',').map((o: string) => o.trim())
      : [];

    await server.register(cors, {
      // In development allow everything; in production use strict allowlist
      origin:
        env.NODE_ENV === 'development'
          ? true
          : (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => {
              if (!origin) {
                // Allow server-to-server requests (no Origin header)
                callback(null, true);
                return;
              }
              if (allowedOrigins.includes(origin)) {
                callback(null, true);
              } else {
                server.log.warn({ origin }, 'CORS: rejected request from disallowed origin');
                callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
              }
            },

      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'X-Correlation-ID',
        'X-API-Key',
      ],
      exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
      credentials: true,
      maxAge: 86_400, // 24 hours — browser preflight cache
    });

    server.log.info(
      { allowedOrigins: env.NODE_ENV === 'development' ? ['*'] : allowedOrigins },
      'CORS plugin registered',
    );
  },
  {
    name: 'cors-plugin',
    fastify: '4.x',
  },
);