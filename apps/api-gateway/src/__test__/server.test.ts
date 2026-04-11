/**
 * Day 2 integration tests — server bootstrap and plugin behaviour.
 *
 * These are fast integration tests using Fastify's inject() method —
 * no actual TCP socket is opened, so they run in milliseconds.
 *
 * Run: pnpm --filter api-gateway test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Set env before importing server (Zod validates on import)
process.env['NODE_ENV']    = 'test';
process.env['JWT_SECRET']  = 'test-secret-that-is-at-least-32-chars-long!!';
process.env['REDIS_URL']   = 'redis://localhost:6379';
process.env['CORS_ORIGINS'] = 'http://localhost:3000';

import { buildServer } from '../server.js';

describe('API Gateway — Day 2', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  // ── Health endpoints ──────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns 200 with expected shape', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        status: string;
        service: string;
        environment: string;
        uptime: number;
        requestId: string;
        timestamp: string;
      }>();

      expect(body.status).toBe('ok');
      expect(body.service).toBe('api-gateway');
      expect(body.environment).toBe('test');
      expect(typeof body.uptime).toBe('number');
      expect(typeof body.requestId).toBe('string');
      expect(body.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 with checks object', async () => {
      const res = await server.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(200);

      const body = res.json<{ status: string; checks: Record<string, string> }>();
      expect(body.status).toBe('ok');
      expect(body.checks).toBeDefined();
      expect(body.checks['redis']).toBe('pending');
    });
  });

  describe('GET /health/metrics', () => {
    it('returns process memory stats', async () => {
      const res = await server.inject({ method: 'GET', url: '/health/metrics' });
      expect(res.statusCode).toBe(200);

      const body = res.json<{
        memory: { heapUsedMb: number; rssMb: number };
        process: { pid: number; nodeVersion: string };
      }>();

      expect(body.memory.heapUsedMb).toBeGreaterThan(0);
      expect(body.memory.rssMb).toBeGreaterThan(0);
      expect(body.process.pid).toBe(process.pid);
      expect(body.process.nodeVersion).toMatch(/^v\d+/);
    });
  });

  // ── Security headers (Helmet) ─────────────────────────────────────────

  describe('Security headers', () => {
    it('sets X-Content-Type-Options: nosniff', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('sets X-Frame-Options: DENY', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('does not expose X-Powered-By', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('sets Content-Security-Policy', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.headers['content-security-policy']).toBeDefined();
    });
  });

  // ── Request context ───────────────────────────────────────────────────

  describe('Request context plugin', () => {
    it('reflects X-Request-ID back on the response', async () => {
      const clientId = 'my-client-request-id-123';
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-request-id': clientId },
      });
      expect(res.headers['x-request-id']).toBe(clientId);
    });

    it('generates X-Request-ID when client does not supply one', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('reflects X-Correlation-ID on the response', async () => {
      const corrId = 'trace-abc-123';
      const res = await server.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-correlation-id': corrId },
      });
      expect(res.headers['x-correlation-id']).toBe(corrId);
    });

    it('sets Server-Timing header on every response', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.headers['server-timing']).toMatch(/total;dur=\d+/);
    });
  });

  // ── Error handling ────────────────────────────────────────────────────

  describe('Error handling', () => {
    it('returns 404 with structured body for unknown routes', async () => {
      const res = await server.inject({ method: 'GET', url: '/does-not-exist' });
      expect(res.statusCode).toBe(404);

      const body = res.json<{ status: string; code: string; requestId: string }>();
      expect(body.status).toBe('error');
      expect(body.code).toBe('ROUTE_NOT_FOUND');
      expect(body.requestId).toBeDefined();
    });

    it('returns 404 with requestId in body', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/unknown-route',
        headers: { 'x-request-id': 'test-req-id' },
      });
      expect(res.statusCode).toBe(404);
      const body = res.json<{ requestId: string }>();
      expect(body.requestId).toBe('test-req-id');
    });
  });

  // ── CORS ──────────────────────────────────────────────────────────────

  describe('CORS (development mode)', () => {
    it('responds to OPTIONS preflight with 204', async () => {
      const res = await server.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });
      // In dev mode all origins are allowed
      expect([200, 204]).toContain(res.statusCode);
    });
  });
});