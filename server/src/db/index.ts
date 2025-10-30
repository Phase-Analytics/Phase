import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import {
  account,
  apikey,
  devices,
  events,
  session,
  sessions,
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
  devices,
  sessions,
  events,
};

export const db = drizzle(client, { schema });

export {
  account,
  apikey,
  devices,
  events,
  session,
  sessions,
  user,
  verification,
} from './schema';
