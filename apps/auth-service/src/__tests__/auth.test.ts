/**
 * Auth service integration tests.
 * Uses Fastify inject() — no real TCP, no Redis needed.
 * Run: pnpm --filter @repo/auth-service test
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

process.env['NODE_ENV']   = 'test';
process.env['JWT_SECRET'] = 'test-secret-that-is-32-characters-long!!';
process.env['REDIS_URL']  = 'redis://localhost:6379';

import { buildServer } from '../server.js';

describe('Auth Service — Day 4', () => {
  let server: FastifyInstance;

  const testUser = {
    email: 'test@example.com',
    password: 'Password123',
    name: 'Test User',
  };

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  // ── Health ─────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns 200', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('ok');
    });
  });

  // ── Register ───────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('creates a new user and returns tokens', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.status).toBe('success');
      expect(body.data.user.email).toBe(testUser.email);
      expect(body.data.user.role).toBe('user');
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.expiresIn).toBeGreaterThan(0);
      // Password must never appear in response
      expect(JSON.stringify(body)).not.toContain('Password123');
      expect(JSON.stringify(body)).not.toContain('passwordHash');
    });

    it('rejects duplicate email with 409', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: testUser,
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('rejects weak password with 422', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'new@example.com', password: 'weak', name: 'Test' },
      });
      expect(res.statusCode).toBe(422);
    });

    it('rejects invalid email with 422', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'not-an-email', password: 'Password123', name: 'Test' },
      });
      expect(res.statusCode).toBe(422);
    });
  });

  // ── Login ──────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns tokens for valid credentials', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: testUser.email, password: testUser.password },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    it('rejects wrong password with 401', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: testUser.email, password: 'WrongPassword1' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects unknown email with 401', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nobody@example.com', password: 'Password123' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns same error for wrong email and wrong password (no enumeration)', async () => {
      const wrongEmail = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nobody@example.com', password: 'Password123' },
      });
      const wrongPass = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: testUser.email, password: 'WrongPassword1' },
      });
      expect(wrongEmail.json().message).toBe(wrongPass.json().message);
    });
  });

  // ── Refresh ────────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('issues new token pair for valid refresh token', async () => {
      const loginRes = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: testUser.email, password: testUser.password },
      });
      const { refreshToken } = loginRes.json().data;

      const refreshRes = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken },
      });
      expect(refreshRes.statusCode).toBe(200);
      const body = refreshRes.json();
      expect(body.data.accessToken).toBeDefined();
      // New refresh token should be different (rotation)
      expect(body.data.refreshToken).not.toBe(refreshToken);
    });

    it('rejects invalid refresh token with 401', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: 'invalid.token.here' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Logout ─────────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('returns 200 and success message', async () => {
      const loginRes = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: testUser.email, password: testUser.password },
      });
      const { refreshToken } = loginRes.json().data;

      const res = await server.inject({
        method: 'POST',
        url: '/auth/logout',
        payload: { refreshToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('success');
    });

    it('returns 200 even for invalid token (idempotent)', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/auth/logout',
        payload: { refreshToken: 'already.expired.token' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Me ─────────────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('returns user profile for valid access token', async () => {
      const loginRes = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: testUser.email, password: testUser.password },
      });
      const { accessToken } = loginRes.json().data;

      const res = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.email).toBe(testUser.email);
      expect(body.data.name).toBe(testUser.name);
    });

    it('rejects request without token with 401', async () => {
      const res = await server.inject({ method: 'GET', url: '/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('rejects malformed bearer token with 401', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: 'Bearer not.a.valid.jwt' },
      });
      expect(res.statusCode).toBe(401);
    });
  });
});