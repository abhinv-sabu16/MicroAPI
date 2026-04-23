import { Redis } from 'ioredis';

import { env } from '../config/env.js';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 3000,
    });

    client.on('connect', () => {
      console.log('[redis] connected');
    });

    client.on('error', (err: Error) => {
      console.warn('[redis] connection error:', err.message);
    });
  }
  return client;
}

const PREFIX = 'refresh_token:';

export async function storeRefreshToken(
  jti: string,
  userId: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    await getRedis().set(`${PREFIX}${jti}`, userId, 'EX', ttlSeconds);
  } catch {
    console.warn('[redis] storeRefreshToken failed — token revocation disabled');
  }
}

export async function isRefreshTokenRevoked(jti: string): Promise<boolean> {
  try {
    const value = await getRedis().get(`${PREFIX}${jti}`);
    return value === null;
  } catch {
    console.warn('[redis] isRefreshTokenRevoked failed — allowing token');
    return false;
  }
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  try {
    await getRedis().del(`${PREFIX}${jti}`);
  } catch {
    console.warn('[redis] revokeRefreshToken failed');
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
