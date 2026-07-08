export const EXPLORE_DEFAULT_SQL = `SELECT timestamp, user_id, name AS event_name
FROM events
ORDER BY timestamp DESC
LIMIT 100`;

export function defaultExploreSqlQuery() {
  return {
    version: 1 as const,
    sql: EXPLORE_DEFAULT_SQL,
  };
}
