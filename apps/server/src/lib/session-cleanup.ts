import { and, gte, lt, sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import { db, sessions } from '@/db';
import { withRedisLock } from '@/lib/redis-lock';
import { SESSION_MIN_DURATION_SECONDS } from '@/lib/validators';

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const STALE_SESSION_GRACE_MS = 10 * 60 * 1000;
// Only sessions that went quiet recently are considered. This keeps the scan
// on the last_activity_at index and leaves alone sessions replayed from an
// offline queue, whose activity may still be arriving.
const CLEANUP_WINDOW_MS = 30 * 60 * 1000;
const LOCK_KEY = 'jobs:session-cleanup';
const LOCK_TTL_SECONDS = 4 * 60;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

async function deleteUnmeasurableSessions(): Promise<void> {
  const now = Date.now();

  await db
    .delete(sessions)
    .where(
      and(
        gte(sessions.lastActivityAt, new Date(now - CLEANUP_WINDOW_MS)),
        lt(sessions.lastActivityAt, new Date(now - STALE_SESSION_GRACE_MS)),
        sql`EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})) < ${SESSION_MIN_DURATION_SECONDS}`
      )
    );
}

export function startSessionCleanup(redis: Redis | null): void {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(() => {
    withRedisLock(
      redis,
      LOCK_KEY,
      LOCK_TTL_SECONDS,
      deleteUnmeasurableSessions
    ).catch((error) => {
      console.error('[SessionCleanup] Failed:', error);
    });
  }, CLEANUP_INTERVAL_MS);
}

export function stopSessionCleanup(): void {
  if (!cleanupTimer) {
    return;
  }

  clearInterval(cleanupTimer);
  cleanupTimer = null;
}
