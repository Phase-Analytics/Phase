import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const migrationPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });

  const migrationDb = drizzle({ client: migrationPool });

  try {
    await migrate(migrationDb, {
      migrationsFolder: './drizzle',
    });
  } catch (error) {
    console.error('[Migration] Failed to apply migrations:', error);
    throw error;
  } finally {
    await migrationPool.end();
  }
}
