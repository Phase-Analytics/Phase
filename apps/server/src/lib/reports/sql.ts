import { type SQL, sql } from 'drizzle-orm';

/** Seconds between start and last activity of `sessions_analytics s`. */
export const sessionDuration = sql`EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))`;

/**
 * Local calendar date (YYYY-MM-DD) of a `timestamp without time zone` column
 * holding UTC wall time.
 */
export function localDay(column: SQL, timeZone: string): SQL {
  return sql`to_char((${column} AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone})::date, 'YYYY-MM-DD')`;
}

/** Binds an instant as UTC wall time, independent of the process time zone. */
export function utcTimestamp(value: Date): SQL {
  return sql`${value.toISOString()}::timestamp`;
}
