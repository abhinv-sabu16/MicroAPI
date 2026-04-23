import bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

import {
  LoginSchema,
  LogoutSchema,
  RefreshSchema,
  RegisterSchema,
} from '../types/schemas.js';
import {
  isRefreshTokenRevoked,
  revokeRefreshToken,
  storeRefreshToken,
} from '../utils/redis.js';
import {
  parseTTLToSeconds,
  signTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { userStore } from '../utils/user-store.js';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12; // ~250ms on modern hardware — good balance of security/speed

export async function authRoutes(
  server: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // ── POST /auth/register ────────────────────────────────────────────────
  server.post('/auth/register', async (request, reply) => {
    const result = RegisterSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(422).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration data',
        details: result.error.flatten().fieldErrors,
      });
    }

    const { email, password, name } = result.data;

    // Check for existing account — use a generic message to avoid email enumeration
    if (userStore.exists(email)) {
      return reply.code(409).send({
        status: 'error',
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = userStore.create({
      email,
      name,
      passwordHash,
      role: 'user',
    });

    const tokens = signTokenPair(user);
    const refreshTTL = parseTTLToSeconds(env.JWT_REFRESH_TOKEN_TTL);

    // Decode the refresh token to get the jti for Redis storage
    const { jti } = verifyRefreshToken(tokens.refreshToken);
    await storeRefreshToken(jti, user.id, refreshTTL);

    server.log.info({ userId: user.id, email: user.email }, 'User registered');

    return reply.code(201).send({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  });

  // ── POST /auth/login ───────────────────────────────────────────────────
  server.post('/auth/login', async (request, reply) => {
    const result = LoginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(422).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid login data',
        details: result.error.flatten().fieldErrors,
      });
    }

    const { email, password } = result.data;
    const user = userStore.findByEmail(email);

    // Use constant-time comparison to prevent timing attacks
    // Always run bcrypt even if user not found (prevents user enumeration via timing)
    const passwordHash = user?.passwordHash ?? '$2a$12$invalidhashfortimingprotection000000000000';
    const passwordValid = await bcrypt.compare(password, passwordHash);

    if (!user || !passwordValid) {
      return reply.code(401).send({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const tokens = signTokenPair(user);
    const refreshTTL = parseTTLToSeconds(env.JWT_REFRESH_TOKEN_TTL);
    const { jti } = verifyRefreshToken(tokens.refreshToken);
    await storeRefreshToken(jti, user.id, refreshTTL);

    server.log.info({ userId: user.id }, 'User logged in');

    return reply.code(200).send({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  });

  // ── POST /auth/refresh ─────────────────────────────────────────────────
  server.post('/auth/refresh', async (request, reply) => {
    const result = RefreshSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(422).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Refresh token is required',
      });
    }

    let payload;
    try {
      payload = verifyRefreshToken(result.data.refreshToken);
    } catch {
      return reply.code(401).send({
        status: 'error',
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired',
      });
    }

    // Check if token has been revoked in Redis
    const isRevoked = await isRefreshTokenRevoked(payload.jti);
    if (isRevoked) {
      return reply.code(401).send({
        status: 'error',
        code: 'REFRESH_TOKEN_REVOKED',
        message: 'Refresh token has been revoked',
      });
    }

    const user = userStore.findById(payload.sub);
    if (!user) {
      return reply.code(401).send({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User no longer exists',
      });
    }

    // Rotate — revoke the old token and issue a new pair
    await revokeRefreshToken(payload.jti);

    const tokens = signTokenPair(user);
    const refreshTTL = parseTTLToSeconds(env.JWT_REFRESH_TOKEN_TTL);
    const { jti: newJti } = verifyRefreshToken(tokens.refreshToken);
    await storeRefreshToken(newJti, user.id, refreshTTL);

    server.log.info({ userId: user.id }, 'Token refreshed');

    return reply.code(200).send({
      status: 'success',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  });

  // ── POST /auth/logout ──────────────────────────────────────────────────
  server.post('/auth/logout', async (request, reply) => {
    const result = LogoutSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(422).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Refresh token is required',
      });
    }

    try {
      const payload = verifyRefreshToken(result.data.refreshToken);
      await revokeRefreshToken(payload.jti);
      server.log.info({ userId: payload.sub }, 'User logged out');
    } catch {
      // Even if the token is invalid/expired, logout should succeed
      // (idempotent — logging out twice is fine)
    }

    return reply.code(200).send({
      status: 'success',
      data: { message: 'Logged out successfully' },
    });
  });

  // ── GET /auth/me ───────────────────────────────────────────────────────
  server.get('/auth/me', async (request, reply) => {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({
        status: 'error',
        code: 'MISSING_TOKEN',
        message: 'Authorization header with Bearer token is required',
      });
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return reply.code(401).send({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Access token is invalid or expired',
      });
    }

    const user = userStore.findById(payload.sub);
    if (!user) {
      return reply.code(404).send({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return reply.code(200).send({
      status: 'success',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });
}