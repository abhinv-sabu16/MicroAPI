import bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

import { getPrisma } from '../utils/prisma.js';
import { cacheKeys, deleteCached, getCached, invalidateListCache, setCached } from '../utils/cache.js';
import {
  CreateUserSchema,
  ListUsersSchema,
  UpdateUserSchema,
  UserIdSchema,
} from '../types/schemas.js';

const BCRYPT_ROUNDS = 12;

// Strip passwordHash from all user responses
function sanitizeUser(user: Record<string, unknown>) {
  const { passwordHash: _, ...safe } = user as { passwordHash: string; [key: string]: unknown };
  return safe;
}

export async function userRoutes(
  server: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  const prisma = getPrisma();

  // ── GET /users ─────────────────────────────────────────────────────────
  server.get('/users', async (request, reply) => {
    const result = ListUsersSchema.safeParse(request.query);
    if (!result.success) {
      return reply.code(422).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: result.error.flatten().fieldErrors,
      });
    }

    const { page, limit, role, isActive, search, sortBy, sortOrder } = result.data;
    const cacheKey = cacheKeys.list(JSON.stringify(result.data));

    // Cache hit
    const cached = await getCached(cacheKey);
    if (cached) {
      void reply.header('X-Cache', 'HIT');
      return reply.code(200).send(cached);
    }

    const where = {
      deletedAt: null,
      ...(role     && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(search   && {
        OR: [
          { name:  { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true, email: true, name: true, role: true,
          isActive: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const response = {
      status: 'success',
      data: users,
      pagination: {
        page, limit, total, totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    await setCached(cacheKey, response);
    void reply.header('X-Cache', 'MISS');
    return reply.code(200).send(response);
  });

  // ── GET /users/:id ─────────────────────────────────────────────────────
  server.get('/users/:id', async (request, reply) => {
    const params = UserIdSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(422).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid user ID format',
      });
    }

    const { id } = params.data;
    const cacheKey = cacheKeys.user(id);

    // Cache hit
    const cached = await getCached(cacheKey);
    if (cached) {
      void reply.header('X-Cache', 'HIT');
      return reply.code(200).send({ status: 'success', data: cached });
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true, updatedAt: true,
      },
    });

    if (!user) {
      return reply.code(404).send({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: `User with id '${id}' not found`,
      });
    }

    await setCached(cacheKey, user);
    void reply.header('X-Cache', 'MISS');
    return reply.code(200).send({ status: 'success', data: user });
  });

  // ── POST /users ────────────────────────────────────────────────────────
  server.post('/users', async (request, reply) => {
    const result = CreateUserSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(422).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid user data',
        details: result.error.flatten().fieldErrors,
      });
    }

    const { email, name, password, role } = result.data;

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({
        status: 'error',
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'A user with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true, updatedAt: true,
      },
    });

    // Invalidate list cache when a new user is created
    await invalidateListCache();
    server.log.info({ userId: user.id }, 'User created');

    return reply.code(201).send({ status: 'success', data: user });
  });

  // ── PUT /users/:id ─────────────────────────────────────────────────────
  server.put('/users/:id', async (request, reply) => {
    const params = UserIdSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(422).send({
        status: 'error', code: 'VALIDATION_ERROR', message: 'Invalid user ID',
      });
    }

    const body = UpdateUserSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(422).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid update data',
        details: body.error.flatten().fieldErrors,
      });
    }

    const { id } = params.data;
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return reply.code(404).send({
        status: 'error', code: 'USER_NOT_FOUND', message: `User '${id}' not found`,
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { ...body.data, updatedAt: new Date() },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true, updatedAt: true,
      },
    });

    // Invalidate both the individual user cache and list cache
    await Promise.all([
      deleteCached(cacheKeys.user(id)),
      invalidateListCache(),
    ]);

    server.log.info({ userId: id }, 'User updated');
    return reply.code(200).send({ status: 'success', data: user });
  });

  // ── DELETE /users/:id (soft delete) ───────────────────────────────────
  server.delete('/users/:id', async (request, reply) => {
    const params = UserIdSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(422).send({
        status: 'error', code: 'VALIDATION_ERROR', message: 'Invalid user ID',
      });
    }

    const { id } = params.data;
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return reply.code(404).send({
        status: 'error', code: 'USER_NOT_FOUND', message: `User '${id}' not found`,
      });
    }

    // Soft delete — sets deletedAt timestamp, data is retained
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await Promise.all([
      deleteCached(cacheKeys.user(id)),
      invalidateListCache(),
    ]);

    server.log.info({ userId: id }, 'User deleted (soft)');
    return reply.code(200).send({
      status: 'success',
      data: { message: 'User deleted successfully' },
    });
  });
}