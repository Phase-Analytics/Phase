import {
  formatLinkBrowserFamilyLabel,
  getLinkOsLabel,
  trimLinkReferrerDisplay,
} from '@phase/shared';
import { executeQuestDBReadQuery } from '@/lib/questdb';
import { escapeQuestDbString } from '@/lib/questdb-sql';
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
  return escapeQuestDbString(value);
}

function computePercentChange(current: number, previous: number): number {
  const baseline = Math.max(previous, 1);
  return Number((((current - previous) / baseline) * 100).toFixed(2));
}

async function getLink24hChangeMetrics(
  appId: string,
  linkId: string
): Promise<{
  totalClicksChange24h: number;
  uniqueVisitsChange24h: number;
}> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const start24 = escapeSqlString(twentyFourHoursAgo.toISOString());
  const start48 = escapeSqlString(fortyEightHoursAgo.toISOString());
  const end = escapeSqlString(now.toISOString());

  const base = `
    app_id = '${appId}'
    AND link_id = '${linkId}'
  `;

  const [last24Rows, prev24Rows] = await Promise.all([
    executeQuestDBReadQuery<{
      clicks: number;
      unique_visits: number;
    }>(`
        SELECT
          count() AS clicks,
          count_distinct(visitor_key) AS unique_visits
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${base}
          AND timestamp >= '${start24}'
          AND timestamp < '${end}'
      `),
    executeQuestDBReadQuery<{
      clicks: number;
      unique_visits: number;
    }>(`
        SELECT
          count() AS clicks,
          count_distinct(visitor_key) AS unique_visits
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${base}
          AND timestamp >= '${start48}'
          AND timestamp < '${start24}'
      `),
  ]);

  const last24 = last24Rows[0];
  const prev24 = prev24Rows[0];

  return {
    totalClicksChange24h: computePercentChange(
      Number(last24?.clicks ?? 0),
      Number(prev24?.clicks ?? 0)
    ),
    uniqueVisitsChange24h: computePercentChange(
      Number(last24?.unique_visits ?? 0),
      Number(prev24?.unique_visits ?? 0)
    ),
  };
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
    changeMetrics,
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
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT os AS key, count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY os
        ORDER BY count DESC
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT browser AS key, count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY browser
        ORDER BY count DESC
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT
          CASE
            WHEN referrer IS NULL
              OR referrer = ''
              OR lower(referrer) = 'null'
              OR lower(referrer) = '(direct)'
            THEN 'direct'
            ELSE referrer
          END AS key,
          count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY key
        ORDER BY count DESC
      `),
    getLink24hChangeMetrics(appId, linkId),
  ]);

  const summary = summaryRows[0];

  return {
    totalClicks: Number(summary?.total_clicks ?? 0),
    totalClicksChange24h: changeMetrics.totalClicksChange24h,
    uniqueVisits: Number(summary?.unique_visits ?? 0),
    uniqueVisitsChange24h: changeMetrics.uniqueVisitsChange24h,
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
  };
}

function buildLinkClicksWhereClause(options: {
  appId: string;
  linkId: string;
}): string {
  const appId = escapeSqlString(options.appId);
  const linkId = escapeSqlString(options.linkId);
  return [`app_id = '${appId}'`, `link_id = '${linkId}'`].join(' AND ');
}

export async function getLinkClicks(options: {
  appId: string;
  linkId: string;
  page: number;
  pageSize: number;
}) {
  const page = Math.max(1, options.page);
  const pageSize = Math.min(Math.max(1, options.pageSize), 100);
  const offset = (page - 1) * pageSize;
  const where = buildLinkClicksWhereClause(options);
  const limitClause =
    offset > 0 ? `LIMIT ${offset}, ${offset + pageSize}` : `LIMIT ${pageSize}`;

  const [countRows, clickRows] = await Promise.all([
    executeQuestDBReadQuery<{ total: number }>(`
        SELECT count() AS total
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${where}
      `),
    executeQuestDBReadQuery<{
      click_id: string;
      timestamp: string;
      os: string;
      browser: string;
      referrer: string;
      country_code: string;
    }>(`
        SELECT
          click_id,
          timestamp,
          os,
          browser,
          referrer,
          country_code
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${where}
        ORDER BY timestamp DESC
        ${limitClause}
      `),
  ]);

  const total = Number(countRows[0]?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    clicks: clickRows.map((row) => ({
      clickId: row.click_id,
      timestamp: new Date(row.timestamp).toISOString(),
      os: getLinkOsLabel(row.os ?? ''),
      browser: normalizeLinkClickBrowser(row.browser ?? ''),
      referrer: trimLinkReferrerDisplay(row.referrer ?? ''),
      countryCode: normalizeLinkClickCountry(row.country_code),
    })),
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}

function normalizeLinkClickBrowser(value: string): string {
  if (!value || value === 'unknown') {
    return 'Unknown';
  }
  return formatLinkBrowserFamilyLabel(value);
}

function normalizeLinkClickCountry(value: string): string | null {
  if (!value || value === 'unknown') {
    return null;
  }
  return value;
}

export async function getLinkClickCount(linkId: string): Promise<number> {
  const rows = await executeQuestDBReadQuery<{ count: number }>(`
    SELECT count() AS count
    FROM ${QUESTDB_LINK_CLICKS_TABLE}
    WHERE link_id = '${escapeSqlString(linkId)}'
  `);

  return Number(rows[0]?.count ?? 0);
}
