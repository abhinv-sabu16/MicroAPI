/**
 * User service integration tests.
 * Prisma is mocked — no real database needed to run tests.
 * Run: pnpm --filter @repo/user-service test
 */
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

process.env['NODE_ENV']      = 'test';
process.env['DATABASE_URL']  = 'postgresql://postgres:postgres@localhost:5432/gateway_db';
process.env['REDIS_URL']     = 'redis://localhost:6379';

// ── Mock Prisma ─────────────────────────────────────────────────────────────
const mockUser = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPrisma = {
  user: {
    findMany:  vi.fn().mockResolvedValue([mockUser]),
    findFirst: vi.fn().mockResolvedValue(mockUser),
    findUnique: vi.fn().mockResolvedValue(null),
    create:    vi.fn().mockResolvedValue(mockUser),
    update:    vi.fn().mockResolvedValue(mockUser),
    count:     vi.fn().mockResolvedValue(1),
  },
  $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
};

vi.mock('../utils/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}));

vi.mock('../utils/cache.js', () => ({
  getCached: vi.fn().mockResolvedValue(null),
  setCached: vi.fn().mockResolvedValue(undefined),
  deleteCached: vi.fn().mockResolvedValue(undefined),
  invalidateListCache: vi.fn().mockResolvedValue(undefined),
  closeCache: vi.fn(),
  cacheKeys: {
    user: (id: string) => `user:${id}`,
    list: (q: string)  => `users:list:${q}`,
  },
}));

import { buildServer } from '../server.js';

describe('User Service — Day 6', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findMany.mockResolvedValue([mockUser]);
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue(mockUser);
    mockPrisma.user.count.mockResolvedValue(1);
  });

  // ── Health ─────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns 200 with db check', async () => {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('ok');
      expect(res.json().checks.database).toBe('ok');
    });
  });

  // ── List users ─────────────────────────────────────────────────────────

  describe('GET /users', () => {
    it('returns paginated list of users', async () => {
      const res = await server.inject({ method: 'GET', url: '/users' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe('success');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBe(1);
    });

    it('accepts pagination query params', async () => {
      const res = await server.inject({ method: 'GET', url: '/users?page=1&limit=5' });
      expect(res.statusCode).toBe(200);
    });

    it('accepts search query param', async () => {
      const res = await server.inject({ method: 'GET', url: '/users?search=test' });
      expect(res.statusCode).toBe(200);
    });

    it('rejects invalid limit with 422', async () => {
      const res = await server.inject({ method: 'GET', url: '/users?limit=999' });
      expect(res.statusCode).toBe(422);
    });
  });

  // ── Get user by ID ─────────────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('returns user for valid UUID', async () => {
      const res = await server.inject({
        method: 'GET',
        url: `/users/${mockUser.id}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.email).toBe(mockUser.email);
    });

    it('returns 404 when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const res = await server.inject({
        method: 'GET',
        url: '/users/00000000-0000-4000-a000-000000000000',
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe('USER_NOT_FOUND');
    });

    it('returns 422 for invalid UUID format', async () => {
      const res = await server.inject({ method: 'GET', url: '/users/not-a-uuid' });
      expect(res.statusCode).toBe(422);
    });
  });

  // ── Create user ────────────────────────────────────────────────────────

  describe('POST /users', () => {
    it('creates user and returns 201', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/users',
        payload: {
          email: 'new@example.com',
          name: 'New User',
          password: 'Password123',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().status).toBe('success');
      expect(res.json().data.email).toBe(mockUser.email);
    });

    it('returns 409 for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const res = await server.inject({
        method: 'POST',
        url: '/users',
        payload: {
          email: 'existing@example.com',
          name: 'Existing User',
          password: 'Password123',
        },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('returns 422 for invalid email', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/users',
        payload: { email: 'bad-email', name: 'Test', password: 'Password123' },
      });
      expect(res.statusCode).toBe(422);
    });

    it('returns 422 for weak password', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/users',
        payload: { email: 'test@example.com', name: 'Test', password: 'weak' },
      });
      expect(res.statusCode).toBe(422);
    });

    it('never returns passwordHash in response', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/users',
        payload: { email: 'test@example.com', name: 'Test', password: 'Password123' },
      });
      expect(JSON.stringify(res.json())).not.toContain('passwordHash');
      expect(JSON.stringify(res.json())).not.toContain('password_hash');
    });
  });

  // ── Update user ────────────────────────────────────────────────────────

  describe('PUT /users/:id', () => {
    it('updates user and returns 200', async () => {
      const res = await server.inject({
        method: 'PUT',
        url: `/users/${mockUser.id}`,
        payload: { name: 'Updated Name' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('success');
    });

    it('returns 404 when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const res = await server.inject({
        method: 'PUT',
        url: '/users/00000000-0000-4000-a000-000000000000',
        payload: { name: 'New Name' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 422 for invalid UUID', async () => {
      const res = await server.inject({
        method: 'PUT',
        url: '/users/bad-id',
        payload: { name: 'Name' },
      });
      expect(res.statusCode).toBe(422);
    });
  });

  // ── Delete user ────────────────────────────────────────────────────────

  describe('DELETE /users/:id', () => {
    it('soft deletes user and returns 200', async () => {
      const res = await server.inject({
        method: 'DELETE',
        url: `/users/${mockUser.id}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.message).toBe('User deleted successfully');
    });

    it('returns 404 when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const res = await server.inject({
        method: 'DELETE',
        url: '/users/00000000-0000-4000-a000-000000000000',
      });
      expect(res.statusCode).toBe(404);
    });
  });
});