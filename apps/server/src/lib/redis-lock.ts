import type Redis from 'ioredis';
import { ulid } from 'ulid';

const RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

/**
 * Runs `task` only if this process wins the lock, so periodic jobs execute on
 * one replica at a time. The lock expires on its own if the holder dies, and
 * release is token-checked so a slow holder cannot delete a lock that has
 * since been taken over. Without Redis (single-process dev) the task runs
 * unguarded. Returns false when another holder has the lock.
 */
export async function withRedisLock(
  redis: Redis | null,
  key: string,
  ttlSeconds: number,
  task: () => Promise<void>
): Promise<boolean> {
  if (!redis) {
    await task();
    return true;
  }

  const token = ulid();
  const acquired = await redis.set(key, token, 'EX', ttlSeconds, 'NX');
  if (acquired !== 'OK') {
    return false;
  }

  try {
    await task();
  } finally {
    await redis.eval(RELEASE_SCRIPT, 1, key, token).catch((error) => {
      console.error(`[RedisLock] Failed to release ${key}:`, error);
    });
  }
  return true;
}
