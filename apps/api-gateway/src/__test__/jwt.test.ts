/**
 * Day 5 — JWT middleware integration tests.
 * Tests the gateway's authenticate, optionalAuthenticate and requireRole hooks.
 *
 * Run: pnpm --filter @repo/api-gateway test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

process.env['NODE_ENV']   = 'test';
process.env['JWT_SECRET'] = 'test-secret-that-is-32-characters-long!!';
process.env['REDIS_URL']  = 'redis://localhost:6379';

import { buildServer } from '../server.js';

const SECRET = 'test-secret-that-is-32-characters-long!!';

// ── Token factories ────────────────────────────────────────────────────────

function makeToken(
  overrides: Partial<{
    sub: string;
    email: string;
    name: string;
    role: string;
    type: string;
    expiresIn: string;
    issuer: string;
    audience: string;
  }> = {},
): string {
  const {
    sub = 'user-123',
    email = 'test@example.com',
    name = 'Test User',
    role = 'user',
    type = 'access',
    expiresIn = '15m',
    issuer = 'auth-service',
    audience = 'api-gateway',
  } = overrides;

  return jwt.sign(
    { sub, email, name, role, type },
    SECRET,
    { expiresIn, issuer, audience } as jwt.SignOptions,
  );
}

function makeExpiredToken(): string {
  return jwt.sign(
    { sub: 'user-123', email: 'test@example.com', name: 'Test', role: 'user', type: 'access' },
    SECRET,
    { expiresIn: '-1s', issuer: 'auth-service', audience: 'api-gateway' } as jwt.SignOptions,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('API Gateway — Day 5 JWT middleware', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  // ── authenticate hook ──────────────────────────────────────────────────

  describe('GET /api/v1/profile (requires auth)', () => {
    it('returns 200 with user data for valid token', async () => {
      const token = makeToken();
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe('success');
      expect(body.data.email).toBe('test@example.com');
      expect(body.data.role).toBe('user');
    });

    it('returns 401 when Authorization header is missing', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/profile' });
      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe('MISSING_TOKEN');
    });

    it('returns 401 when token is malformed', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: 'Bearer not.a.real.token' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe('INVALID_TOKEN');
    });

    it('returns 401 when token is expired', async () => {
      const token = makeExpiredToken();
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe('TOKEN_EXPIRED');
    });

    it('returns 401 when token has wrong audience', async () => {
      const token = makeToken({ audience: 'wrong-service' });
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for refresh token used as access token', async () => {
      const token = makeToken({ type: 'refresh' });
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(401);
    });

    it('attaches requestId to 401 response', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { 'x-request-id': 'test-req-abc' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().requestId).toBe('test-req-abc');
    });
  });

  // ── requireRole hook ───────────────────────────────────────────────────

  describe('GET /api/v1/admin (requires admin role)', () => {
    it('returns 200 for admin token', async () => {
      const token = makeToken({ role: 'admin' });
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/admin',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 403 for user role', async () => {
      const token = makeToken({ role: 'user' });
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/admin',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe('FORBIDDEN');
    });

    it('returns 403 for readonly role', async () => {
      const token = makeToken({ role: 'readonly' });
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/admin',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 401 with no token', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/admin' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── optionalAuthenticate hook ──────────────────────────────────────────

  describe('GET /api/v1/public (optional auth)', () => {
    it('returns 200 with personalised message when authenticated', async () => {
      const token = makeToken({ name: 'Alice' });
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/public',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.message).toBe('Hello, Alice!');
      expect(res.json().data.authenticated).toBe(true);
    });

    it('returns 200 with anonymous message when no token', async () => {
      const res = await server.inject({ method: 'GET', url: '/api/v1/public' });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.message).toBe('Hello, anonymous!');
      expect(res.json().data.authenticated).toBe(false);
    });

    it('returns 200 with anonymous message when token is invalid', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/public',
        headers: { authorization: 'Bearer invalid.token' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.authenticated).toBe(false);
    });
  });

  // ── Health routes bypass auth ──────────────────────────────────────────

  describe('Health routes (no auth required)', () => {
    it('GET /health returns 200 without token', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
    });

    it('GET /health/ready returns 200 without token', async () => {
      const res = await server.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(200);
    });
  });
});