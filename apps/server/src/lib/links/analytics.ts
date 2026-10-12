import {
  formatLinkBrowserFamilyLabel,
  getLinkOsLabel,
  type LinkAnalyticsRange,
  trimLinkReferrerDisplay,
} from '@phase/shared';
import { eq } from 'drizzle-orm';
import { db, links } from '@/db';
import { executeQuestDBReadQuery } from '@/lib/questdb';
import { escapeQuestDbString } from '@/lib/questdb-sql';
import { getLinkClickTotals } from './click-totals';
import { QUESTDB_LINK_CLICKS_TABLE } from './constants';

const RANGE_DAYS: Record<LinkAnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '180d': 180,
  '360d': 360,
};

function buildLinkWhereClause(options: {
  appId: string;
  linkId: string;
  range: LinkAnalyticsRange;
}): string {
  return [
    `app_id = '${escapeQuestDbString(options.appId)}'`,
    `link_id = '${escapeQuestDbString(options.linkId)}'`,
    `timestamp >= dateadd('d', -${RANGE_DAYS[options.range]}, now())`,
  ].join(' AND ');
}

/**
 * Totals for every link in an app (policies list). Logs and returns null when
 * totals are unavailable so callers omit them instead of reporting 0.
 */
export async function getLinkClickTotalsByApp(
  appId: string
): Promise<Map<string, number> | null> {
  try {
    const rows = await db
      .select({ id: links.id })
      .from(links)
      .where(eq(links.appId, appId));
    return await getLinkClickTotals(
      appId,
      rows.map((row) => row.id)
    );
  } catch (error) {
    console.error('[Links] Click totals unavailable:', error);
    return null;
  }
}

export async function getLinkAnalytics(options: {
  appId: string;
  linkId: string;
  range: LinkAnalyticsRange;
}) {
  const baseWhere = buildLinkWhereClause(options);

  const [
    summaryRows,
    timeseriesRows,
    countryRows,
    osRows,
    browserRows,
    referrerRows,
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
        LIMIT 250
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT os AS key, count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY os
        ORDER BY count DESC
        LIMIT 100
      `),
    executeQuestDBReadQuery<{ key: string; count: number }>(`
        SELECT browser AS key, count() AS count
        FROM ${QUESTDB_LINK_CLICKS_TABLE}
        WHERE ${baseWhere}
        GROUP BY browser
        ORDER BY count DESC
        LIMIT 100
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
        LIMIT 100
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
  };
}

export async function getLinkClicks(options: {
  appId: string;
  linkId: string;
  range: LinkAnalyticsRange;
  page: number;
  pageSize: number;
}) {
  const page = Math.max(1, options.page);
  const pageSize = Math.min(Math.max(1, options.pageSize), 100);
  const offset = (page - 1) * pageSize;
  const where = buildLinkWhereClause(options);
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
