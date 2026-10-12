import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import Redis, { type RedisOptions } from 'ioredis';

/**
 * Redis clients owned by the link subsystem. The redirect path must never
 * wait on a sick Redis, so commands fail fast instead of queueing while
 * disconnected; callers treat every failure as a cache miss.
 */
const HOT_PATH_OPTIONS: RedisOptions = {
  commandTimeout: 250,
  connectTimeout: 2000,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 200, 2000),
};

const FAILURE_LOG_INTERVAL_MS = 10_000;
const lastFailureLogAt = new Map<string, number>();

let commandClient: Redis | null = null;

/** Logs at most once per interval per scope so an outage cannot flood logs. */
export function logLinkRedisFailure(scope: string, error: unknown): void {
  const now = Date.now();
  if (now - (lastFailureLogAt.get(scope) ?? 0) < FAILURE_LOG_INTERVAL_MS) {
    return;
  }
  lastFailureLogAt.set(scope, now);
  console.error(
    `[Links] Redis ${scope} failed, falling back:`,
    error instanceof Error ? error.message : error
  );
}

export function createLinksRedisClient(
  name: string,
  options: RedisOptions = {}
): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  const client = new Redis(url, { ...HOT_PATH_OPTIONS, ...options });
  client.on('error', (error) =>
    logLinkRedisFailure(`${name} connection`, error)
  );
  return client;
}

export function getLinksRedis(): Redis | null {
  if (!commandClient) {
    commandClient = createLinksRedisClient('command');
  }
  return commandClient;
}

/**
 * Connects the command client before the server takes traffic. It does not
 * queue commands while connecting, so a lazily created client failed the
 * first cache invalidation in every new process and left stale redirects in
 * Redis. Bounded so a down Redis cannot block startup.
 */
export async function connectLinksRedis(timeoutMs = 2000): Promise<void> {
  const client = getLinksRedis();
  if (!client || client.status === 'ready') {
    return;
  }
  await Promise.race([
    once(client, 'ready').catch(() => undefined),
    sleep(timeoutMs),
  ]);
}
