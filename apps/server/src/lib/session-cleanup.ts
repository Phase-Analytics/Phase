import { and, lt, sql } from 'drizzle-orm';
import { db, sessions } from '@/db';
import { SESSION_MIN_DURATION_SECONDS } from '@/lib/validators';

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const STALE_SESSION_GRACE_MS = 10 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

async function deleteUnmeasurableSessions(): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_SESSION_GRACE_MS);

  await db
    .delete(sessions)
    .where(
      and(
        lt(sessions.lastActivityAt, staleBefore),
        sql`EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})) < ${SESSION_MIN_DURATION_SECONDS}`
      )
    );
}

export function startSessionCleanup(): void {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(() => {
    deleteUnmeasurableSessions().catch((error) => {
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
