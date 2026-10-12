import { createHmac } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { pool as adminPool } from './index';

const EXPLORE_ROLE = 'phase_explore';
const EXPLORE_PASSWORD_LABEL = 'phase:explore-role:password:v1';
// Tables read by the users/sessions scoped subqueries in lib/explore/sql-rewrite.ts.
const EXPLORE_READABLE_TABLES = ['public.devices', 'public.sessions_analytics'];
const ROLE_ATTRIBUTES =
  'LOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS';

let explorePoolPromise: Promise<Pool> | null = null;

function deriveExplorePassword(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not set');
  }
  return createHmac('sha256', secret)
    .update(EXPLORE_PASSWORD_LABEL)
    .digest('hex');
}

async function provisionRole(
  client: PoolClient,
  password: string
): Promise<void> {
  // The password is hex, so inlining it cannot break out of the literal.
  // Role DDL does not accept bind parameters.
  const passwordLiteral = `'${password}'`;

  await client.query(
    `SELECT pg_advisory_xact_lock(hashtext('${EXPLORE_ROLE}'))`
  );

  const existing = await client.query(
    'SELECT 1 FROM pg_roles WHERE rolname = $1',
    [EXPLORE_ROLE]
  );
  if (existing.rowCount === 0) {
    await client.query(
      `CREATE ROLE ${EXPLORE_ROLE} WITH ${ROLE_ATTRIBUTES} PASSWORD ${passwordLiteral}`
    );
  }

  await client.query(
    `ALTER ROLE ${EXPLORE_ROLE} WITH ${ROLE_ATTRIBUTES} PASSWORD ${passwordLiteral}`
  );
  await client.query(
    `ALTER ROLE ${EXPLORE_ROLE} SET statement_timeout = '30s'`
  );
  await client.query(
    `ALTER ROLE ${EXPLORE_ROLE} SET default_transaction_read_only = on`
  );
  await client.query(
    `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${EXPLORE_ROLE}`
  );
  await client.query(
    `REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${EXPLORE_ROLE}`
  );
  await client.query(`REVOKE CREATE ON SCHEMA public FROM ${EXPLORE_ROLE}`);
  await client.query(`GRANT USAGE ON SCHEMA public TO ${EXPLORE_ROLE}`);
  await client.query(
    `GRANT SELECT ON TABLE ${EXPLORE_READABLE_TABLES.join(', ')} TO ${EXPLORE_ROLE}`
  );
}

async function ensureRoleAndCreatePool(): Promise<Pool> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const password = deriveExplorePassword();

  const client = await adminPool.connect();
  try {
    await client.query('BEGIN');
    await provisionRole(client, password);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError: Error) => {
      console.error(
        '[ExplorePool] Role provisioning rollback failed:',
        rollbackError
      );
    });
    throw error;
  } finally {
    client.release();
  }

  const url = new URL(process.env.DATABASE_URL);
  url.username = EXPLORE_ROLE;
  url.password = password;

  const explorePool = new Pool({
    connectionString: url.toString(),
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30_000,
    application_name: 'phase-explore',
  });
  explorePool.on('error', (error) => {
    console.error('[ExplorePool] Unexpected error on idle client:', error);
  });

  try {
    await explorePool.query('SELECT 1');
  } catch (error) {
    await explorePool.end().catch((endError: Error) => {
      console.error('[ExplorePool] Failed to close unusable pool:', endError);
    });
    throw error;
  }

  return explorePool;
}

/**
 * Resolves the least-privilege pool used for explore Postgres queries,
 * provisioning the role on first use. A failed attempt is not cached, so the
 * next call retries; callers must treat a rejection as "explore unavailable"
 * and never fall back to the main pool.
 */
export function getExplorePool(): Promise<Pool> {
  explorePoolPromise ??= ensureRoleAndCreatePool().catch((error) => {
    explorePoolPromise = null;
    throw error;
  });
  return explorePoolPromise;
}

/**
 * Startup hook. Logs instead of throwing so a role problem disables explore
 * (queries fail closed) without taking ingest and the dashboard down.
 */
export async function ensureExploreRole(): Promise<void> {
  try {
    await getExplorePool();
    console.log(`[ExplorePool] Role ${EXPLORE_ROLE} ready`);
  } catch (error) {
    console.error(
      `[ExplorePool] Failed to provision role ${EXPLORE_ROLE}; explore Postgres queries are disabled until it succeeds:`,
      error
    );
  }
}

export async function closeExplorePool(): Promise<void> {
  const pending = explorePoolPromise;
  explorePoolPromise = null;
  if (!pending) {
    return;
  }
  const explorePool = await pending.catch(() => null);
  await explorePool?.end();
}
