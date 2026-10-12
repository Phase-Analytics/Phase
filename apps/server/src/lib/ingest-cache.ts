import { eq, inArray } from 'drizzle-orm';
import { apps, db, devices, sessions } from '@/db';

/**
 * Process-local caches for the SDK ingest path. Entries are short-lived so
 * that writes made on another replica (device deletion, key rotation) become
 * visible within one TTL without cross-replica invalidation. Misses are never
 * cached: a session or key that does not exist yet must not be remembered as
 * missing.
 */

const SESSION_TTL_MS = 60_000;
const SESSION_MAX_ENTRIES = 50_000;
const APP_KEY_TTL_MS = 60_000;
const APP_KEY_MAX_ENTRIES = 5000;

class TtlLru<K, V> {
  private readonly entries = new Map<K, { value: V; expiresAt: number }>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries: number, ttlMs: number) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) {
        this.entries.delete(oldest.value);
      }
    }
  }

  deleteWhere(predicate: (value: V) => boolean): void {
    for (const [key, entry] of this.entries) {
      if (predicate(entry.value)) {
        this.entries.delete(key);
      }
    }
  }
}

export type App = typeof apps.$inferSelect;

/**
 * The parts of a session the ingest path needs. Everything except
 * lastActivityAt is immutable; lastActivityAt is only a lower bound used to
 * skip redundant activity updates (the activity flush is guarded in SQL).
 */
export type IngestSession = {
  sessionId: string;
  deviceId: string;
  appId: string;
  startedAt: Date;
  lastActivityAt: Date;
  country: string | null;
  platform: string | null;
};

const sessionCache = new TtlLru<string, IngestSession>(
  SESSION_MAX_ENTRIES,
  SESSION_TTL_MS
);
const appKeyCache = new TtlLru<string, App>(
  APP_KEY_MAX_ENTRIES,
  APP_KEY_TTL_MS
);

export function rememberSession(session: IngestSession): void {
  sessionCache.set(session.sessionId, session);
}

export async function getIngestSessions(
  sessionIds: Iterable<string>
): Promise<Map<string, IngestSession>> {
  const found = new Map<string, IngestSession>();
  const missing: string[] = [];

  for (const sessionId of new Set(sessionIds)) {
    const cached = sessionCache.get(sessionId);
    if (cached) {
      found.set(sessionId, cached);
    } else {
      missing.push(sessionId);
    }
  }

  if (missing.length === 0) {
    return found;
  }

  const rows = await db
    .select({
      sessionId: sessions.sessionId,
      deviceId: sessions.deviceId,
      appId: devices.appId,
      startedAt: sessions.startedAt,
      lastActivityAt: sessions.lastActivityAt,
      country: devices.country,
      platform: devices.platform,
    })
    .from(sessions)
    .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
    .where(inArray(sessions.sessionId, missing));

  for (const row of rows) {
    rememberSession(row);
    found.set(row.sessionId, row);
  }

  return found;
}

export async function getIngestSession(
  sessionId: string
): Promise<IngestSession | null> {
  const found = await getIngestSessions([sessionId]);
  return found.get(sessionId) ?? null;
}

export async function getAppByKey(key: string): Promise<App | null> {
  const cached = appKeyCache.get(key);
  if (cached) {
    return cached;
  }

  const app = await db.query.apps.findFirst({ where: eq(apps.key, key) });
  if (app) {
    appKeyCache.set(key, app);
  }
  return app ?? null;
}

/** Call after deleting a device so this replica stops accepting its sessions. */
export function invalidateIngestDevice(deviceId: string): void {
  sessionCache.deleteWhere((session) => session.deviceId === deviceId);
}

/** Call after deleting an app or rotating its key. */
export function invalidateIngestApp(appId: string): void {
  appKeyCache.deleteWhere((app) => app.id === appId);
  sessionCache.deleteWhere((session) => session.appId === appId);
}
