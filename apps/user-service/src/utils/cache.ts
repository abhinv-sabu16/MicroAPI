import { Redis } from 'ioredis';

import { env } from '../config/env.js';

let client: Redis | null = null;

export function getCache(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 3000,
    });
    client.on('error', (err: Error) => {
      console.warn('[cache] Redis error:', err.message);
    });
  }
  return client;
}

export async function closeCache(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

const USER_PREFIX   = 'user:';
const LIST_PREFIX   = 'users:list:';

// ── Cache-aside helpers ────────────────────────────────────────────────────

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const value = await getCache().get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds = env.CACHE_TTL_SECONDS,
): Promise<void> {
  try {
    await getCache().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Cache write failure is non-fatal
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    await getCache().del(key);
  } catch {}
}

// Delete all list cache keys (when a user is created/updated/deleted)
export async function invalidateListCache(): Promise<void> {
  try {
    const keys = await getCache().keys(`${LIST_PREFIX}*`);
    if (keys.length > 0) {
      await getCache().del(...keys);
    }
  } catch {}
}

export const cacheKeys = {
  user: (id: string)         => `${USER_PREFIX}${id}`,
  list: (query: string)      => `${LIST_PREFIX}${query}`,
};