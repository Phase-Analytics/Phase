import { upstashCache } from 'drizzle-orm/cache/upstash';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  account,
  apikey,
  devices,
  errors,
  events,
  session,
  sessions,
  user,
  verification,
} from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  statement_timeout: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

pool.on('error', (error) => {
  console.error('[Database] Unexpected error on idle client:', error);
});

const schema = {
  user,
  session,
  account,
  verification,
  apikey,
  devices,
  sessions,
  events,
  errors,
};

let cacheConfig: ReturnType<typeof upstashCache> | undefined;
try {
  if (process.env.REDIS_REST_URL && process.env.REDIS_REST_TOKEN) {
    cacheConfig = upstashCache({
      url: process.env.REDIS_REST_URL,
      token: process.env.REDIS_REST_TOKEN,
      global: false,
      config: {
        ex: 300,
      },
    });
    console.log(
      '[Database] Redis cache enabled (TTL: 300s, Strategy: explicit)'
    );
  } else {
    console.log(
      '[Database] Redis cache disabled (environment variables not set)'
    );
    cacheConfig = undefined;
  }
} catch (error) {
  console.error('[Database] Failed to initialize Redis cache:', error);
  console.log('[Database] Continuing without cache');
  cacheConfig = undefined;
}

export const db = drizzle({
  client: pool,
  schema,
  ...(cacheConfig && { cache: cacheConfig }),
});

export { pool };

export {
  account,
  apikey,
  devices,
  errors,
  events,
  session,
  sessions,
  user,
  verification,
} from './schema';
