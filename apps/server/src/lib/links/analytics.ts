import { executeQuestDBReadQuery } from '@/lib/questdb';
import { QUESTDB_LINK_CLICKS_TABLE } from './constants';

type RangeWindow = {
  startIso: string;
  endIso: string;
};

const RANGE_TO_MS: Record<string, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '180d': 180 * 24 * 60 * 60 * 1000,
  '360d': 360 * 24 * 60 * 60 * 1000,
};

export function resolveLinkAnalyticsWindow(range: string): RangeWindow {
  const ms = RANGE_TO_MS[range] ?? RANGE_TO_MS['7d'];
  const end = new Date();
  const start = new Date(end.getTime() - ms);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

export async function getLinkClickTotalsByApp(
  appId: string
): Promise<Map<string, number>> {
  try {
    const rows = await executeQuestDBReadQuery<{
      link_id: string;
      total_clicks: number;
    }>(`
        SELECT link_id, count() AS total_clicks
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE app_id = '${escapeSqlString(appId)}'
        GROUP BY link_id
      `);

    return new Map(
      rows.map((row) => [row.link_id, Number(row.total_clicks ?? 0)])
    );
  } catch {
    return new Map();
  }
}

export async function getLinkAnalytics(options: {
  appId: string;
  linkId: string;
  range: string;
}) {
  const { startIso, endIso } = resolveLinkAnalyticsWindow(options.range);
  const appId = escapeSqlString(options.appId);
  const linkId = escapeSqlString(options.linkId);
  const start = escapeSqlString(startIso);
  const end = escapeSqlString(endIso);

  const baseWhere = `
    app_id = '${appId}'
    AND link_id = '${linkId}'
    AND timestamp >= '${start}'
    AND timestamp < '${end}'
  `;

  const [
    summaryRows,
    timeseriesRows,
    countryRows,
    osRows,
    browserRows,
    referrerRows,
    platformRows,
  ] = await Promise.all([
    executeQuestDBReadQuery<{
      total_clicks: number;
      unique_visits: number;
    }>(`
        SELECT
          count() AS total_clicks,
          count_distinct(visitor_key) AS unique_visits
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
      `),
    executeQuestDBReadQuery<{
      date: string;
      clicks: number;
      unique_visits: number;
    }>(`
        SELECT
          to_str(date_trunc('day', timestamp), 'yyyy-MM-dd') AS date,
          count() AS clicks,
          count_distinct(visitor_key) AS unique_visits
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY date
        ORDER BY date ASC
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT country_code AS key, count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY country_code
        ORDER BY count DESC
        LIMIT 20
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT os AS key, count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY os
        ORDER BY count DESC
        LIMIT 20
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT browser AS key, count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY browser
        ORDER BY count DESC
        LIMIT 20
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT referrer AS key, count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY referrer
        ORDER BY count DESC
        LIMIT 20
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT platform AS key, count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY platform
        ORDER BY count DESC
        LIMIT 10
      `),
  ]);

  const summary = summaryRows[0];

  return {
    totalClicks: Number(summary?.total_clicks ?? 0),
    uniqueVisits: Number(summary?.unique_visits ?? 0),
    timeseries: timeseriesRows.map((row) => ({
      date: row.date,
      clicks: Number(row.clicks),
      uniqueVisits: Number(row.unique_visits),
    })),
    countries: countryRows.map((row) => ({
      key: row.key,
      count: Number(row.count),
    })),
    operatingSystems: osRows.map((row) => ({
      key: row.key,
      count: Number(row.count),
    })),
    browsers: browserRows.map((row) => ({
      key: row.key,
      count: Number(row.count),
    })),
    referrers: referrerRows.map((row) => ({
      key: row.key,
      count: Number(row.count),
    })),
    platforms: platformRows.map((row) => ({
      key: row.key,
      count: Number(row.count),
    })),
  };
}

export async function getLinkClickCount(linkId: string): Promise<number> {
  const rows = await executeQuestDBReadQuery<{ count: number }>(`
    SELECT count() AS count
    FROM ${QUESTDB_LINK_CLICKS_TABLE}
    WHERE link_id = '${escapeSqlString(linkId)}'
  `);

  return Number(rows[0]?.count ?? 0);
}
