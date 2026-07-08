export const EXPLORE_DEFAULT_SQL = `SELECT name, count(*) AS count
FROM events
GROUP BY name
ORDER BY count DESC
LIMIT 100`;

export function defaultExploreSqlQuery() {
  return {
    version: 1 as const,
    sql: EXPLORE_DEFAULT_SQL,
  };
}
