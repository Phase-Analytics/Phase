import { setTimeout as sleep } from 'node:timers/promises';
import { and, asc, eq, gt, inArray, lt, notExists, sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import { db, devices, sessions } from '@/db';

/**
 * Postgres side of the 12-month retention policy (QuestDB enforces its own
 * table TTL). Sessions are purged by start time; devices are purged once
 * they are older than the window and have no remaining sessions.
 */

const RETENTION_MONTHS = 12;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
// Claimed once per day across replicas and deliberately not released, so the
// purge runs at most once per window even if it finishes quickly.
const DAILY_CLAIM_KEY = 'jobs:retention:daily';
const DAILY_CLAIM_TTL_SECONDS = 23 * 60 * 60;
const BATCH_SIZE = 5000;
const MAX_RUN_MS = 30 * 60 * 1000;
// Spreads the delete load so a large first purge does not starve ingest.
const BATCH_PAUSE_MS = 100;

let timer: ReturnType<typeof setInterval> | null = null;
let lastLocalRunAt = 0;
let running = false;

function retentionCutoff(): Date {
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
  return cutoff;
}

async function purgeSessions(cutoff: Date, deadline: number): Promise<number> {
  let total = 0;
  while (Date.now() < deadline) {
    const expired = db
      .select({ sessionId: sessions.sessionId })
      .from(sessions)
      .where(lt(sessions.startedAt, cutoff))
      .limit(BATCH_SIZE);
    const deleted = await db
      .delete(sessions)
      .where(inArray(sessions.sessionId, expired))
      .returning({ sessionId: sessions.sessionId });
    total += deleted.length;
    if (deleted.length < BATCH_SIZE) {
      break;
    }
    await sleep(BATCH_PAUSE_MS);
  }
  return total;
}

/** Walks devices in primary-key order so each row is examined once per run. */
async function purgeInactiveDevices(
  cutoff: Date,
  deadline: number
): Promise<number> {
  let total = 0;
  let cursor = '';
  while (Date.now() < deadline) {
    const page = await db
      .select({ deviceId: devices.deviceId })
      .from(devices)
      .where(gt(devices.deviceId, cursor))
      .orderBy(asc(devices.deviceId))
      .limit(BATCH_SIZE);
    const last = page.at(-1);
    if (!last) {
      break;
    }
    cursor = last.deviceId;

    const deleted = await db
      .delete(devices)
      .where(
        and(
          inArray(
            devices.deviceId,
            page.map((row) => row.deviceId)
          ),
          lt(devices.firstSeen, cutoff),
          notExists(
            db
              .select({ one: sql`1` })
              .from(sessions)
              .where(eq(sessions.deviceId, devices.deviceId))
          )
        )
      )
      .returning({ deviceId: devices.deviceId });
    total += deleted.length;
    await sleep(BATCH_PAUSE_MS);
  }
  return total;
}

async function runPurge(): Promise<void> {
  const cutoff = retentionCutoff();
  const deadline = Date.now() + MAX_RUN_MS;
  const purgedSessions = await purgeSessions(cutoff, deadline);
  const purgedDevices = await purgeInactiveDevices(cutoff, deadline);
  console.log(
    `[Retention] Purged ${purgedSessions} sessions and ${purgedDevices} devices older than ${cutoff.toISOString()}`
  );
}

async function claimDailyRun(redis: Redis | null): Promise<boolean> {
  if (!redis) {
    if (Date.now() - lastLocalRunAt < DAILY_CLAIM_TTL_SECONDS * 1000) {
      return false;
    }
    lastLocalRunAt = Date.now();
    return true;
  }
  const claimed = await redis.set(
    DAILY_CLAIM_KEY,
    String(Date.now()),
    'EX',
    DAILY_CLAIM_TTL_SECONDS,
    'NX'
  );
  return claimed === 'OK';
}

async function tick(redis: Redis | null): Promise<void> {
  if (running) {
    return;
  }
  running = true;
  try {
    if (await claimDailyRun(redis)) {
      await runPurge();
    }
  } finally {
    running = false;
  }
}

export function startRetention(redis: Redis | null): void {
  if (timer) {
    return;
  }
  const run = () => {
    tick(redis).catch((error) => {
      console.error('[Retention] Purge failed:', error);
    });
  };
  timer = setInterval(run, CHECK_INTERVAL_MS);
  run();
}

export function stopRetention(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
