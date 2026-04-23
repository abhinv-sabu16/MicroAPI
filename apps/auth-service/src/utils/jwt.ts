import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'readonly';
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    issuer: 'auth-service',
    audience: 'api-gateway',
  };
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_SECRET, options);
}

export function signRefreshToken(userId: string, jti: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_TOKEN_TTL as SignOptions['expiresIn'],
    issuer: 'auth-service',
    audience: 'auth-service',
  };
  return jwt.sign({ sub: userId, jti, type: 'refresh' }, env.JWT_SECRET, options);
}

export function signTokenPair(user: {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'readonly';
}): TokenPair {
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user.id, jti);
  const decoded = jwt.decode(accessToken) as { exp: number; iat: number } | null;
  const expiresIn = decoded ? decoded.exp - decoded.iat : 900;
  return { accessToken, refreshToken, expiresIn };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    issuer: 'auth-service',
    audience: 'api-gateway',
  }) as AccessTokenPayload;
  if (payload.type !== 'access') throw new jwt.JsonWebTokenError('Invalid token type');
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    issuer: 'auth-service',
    audience: 'auth-service',
  }) as RefreshTokenPayload;
  if (payload.type !== 'refresh') throw new jwt.JsonWebTokenError('Invalid token type');
  return payload;
}

export function parseTTLToSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) return 604_800;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1);
}
