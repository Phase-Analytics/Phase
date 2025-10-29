import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import {
  account,
  apiEvents,
  apikey,
  session,
  user,
  verification,
} from './schema';

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_AUTH_TOKEN is not set');
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const schema = {
  user,
  session,
  account,
  verification,
  apikey,
  apiEvents,
};

export const db = drizzle(client, { schema });

export {
  account,
  apiEvents,
  apikey,
  session,
  user,
  verification,
} from './schema';
