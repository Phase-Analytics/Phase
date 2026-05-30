import type { ExploreFilter, PropertySearchCondition } from '@phase/shared';
import { and, count, eq, gte, inArray, lte, type SQL, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import { buildPropertySearchFilters } from '@/lib/property-search';
import { EXPLORE_MAX_BREAKDOWN_ROWS } from './constants';
import type { ExploreDateRange } from './time-range';

function deviceFiltersFromExplore(filters: ExploreFilter[]): SQL[] {
  const sqlFilters: SQL[] = [];

  for (const filter of filters) {
    if (filter.type === 'device') {
      const column =
        filter.field === 'platform'
          ? devices.platform
          : filter.field === 'country'
            ? devices.country
            : filter.field === 'city'
              ? devices.city
              : devices.locale;

      if (filter.operator === 'eq') {
        sqlFilters.push(eq(column, filter.value));
      } else {
        sqlFilters.push(sql`${column} != ${filter.value}`);
      }
    }

    if (filter.type === 'device_property') {
      const propertyCondition: PropertySearchCondition = {
        key: filter.key,
        operator: filter.operator,
        value: filter.value,
      };
      sqlFilters.push(
        ...buildPropertySearchFilters(devices.properties, [propertyCondition])
      );
    }
  }

  return sqlFilters;
}

function buildDeviceWhere(
  appId: string,
  filters: ExploreFilter[],
  eventCohort: string[] | null
): SQL[] {
  const parts: SQL[] = [
    eq(devices.appId, appId),
    ...deviceFiltersFromExplore(filters),
  ];

  if (eventCohort !== null) {
    if (eventCohort.length === 0) {
      return [];
    }
    parts.push(inArray(devices.deviceId, eventCohort));
  }

  return parts;
}

export function isEmptyCohort(eventCohort: string[] | null): boolean {
  return eventCohort !== null && eventCohort.length === 0;
}

export async function countDevicesForExplore(
  appId: string,
  filters: ExploreFilter[],
  eventCohort: string[] | null
): Promise<number> {
  const whereParts = buildDeviceWhere(appId, filters, eventCohort);
  if (whereParts.length === 0) {
    return 0;
  }

  const [row] = await db
    .select({ count: count() })
    .from(devices)
    .where(and(...whereParts));

  return Number(row?.count ?? 0);
}

export async function breakdownDevicesForExplore(
  appId: string,
  filters: ExploreFilter[],
  eventCohort: string[] | null,
  field: 'platform' | 'country' | 'city' | 'locale'
): Promise<Array<{ dimension: string; value: number }>> {
  const whereParts = buildDeviceWhere(appId, filters, eventCohort);
  if (whereParts.length === 0) {
    return [];
  }

  const column =
    field === 'platform'
      ? devices.platform
      : field === 'country'
        ? devices.country
        : field === 'city'
          ? devices.city
          : devices.locale;

  const rows = await db
    .select({
      dimension: sql<string>`COALESCE(${column}, 'unknown')`,
      value: count(),
    })
    .from(devices)
    .where(and(...whereParts))
    .groupBy(column)
    .orderBy(sql`count(*) DESC`)
    .limit(EXPLORE_MAX_BREAKDOWN_ROWS);

  return rows.map((row) => ({
    dimension: row.dimension,
    value: Number(row.value),
  }));
}

function sessionDeviceWhere(
  appId: string,
  filters: ExploreFilter[],
  eventCohort: string[] | null,
  dateRange: ExploreDateRange
): SQL[] | null {
  const whereParts = buildDeviceWhere(appId, filters, eventCohort);
  if (whereParts.length === 0) {
    return null;
  }

  return [
    ...whereParts,
    gte(sessions.startedAt, new Date(dateRange.startDate)),
    lte(sessions.startedAt, new Date(dateRange.endDate)),
  ];
}

export async function avgSessionDurationForExplore(
  appId: string,
  filters: ExploreFilter[],
  eventCohort: string[] | null,
  dateRange: ExploreDateRange
): Promise<number> {
  const whereParts = sessionDeviceWhere(appId, filters, eventCohort, dateRange);
  if (!whereParts) {
    return 0;
  }

  const [row] = await db
    .select({
      avg: sql<number>`COALESCE(
        AVG(EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt}))),
        0
      )`,
    })
    .from(sessions)
    .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
    .where(and(...whereParts));

  return Number(row?.avg ?? 0);
}

export async function countSessionsForExplore(
  appId: string,
  filters: ExploreFilter[],
  eventCohort: string[] | null,
  dateRange: ExploreDateRange
): Promise<number> {
  const whereParts = sessionDeviceWhere(appId, filters, eventCohort, dateRange);
  if (!whereParts) {
    return 0;
  }

  const [row] = await db
    .select({ count: count() })
    .from(sessions)
    .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
    .where(and(...whereParts));

  return Number(row?.count ?? 0);
}

export async function sessionsPerUserTimeseriesForExplore(
  appId: string,
  filters: ExploreFilter[],
  eventCohort: string[] | null,
  dateRange: ExploreDateRange
): Promise<Array<{ date: string; value: number }>> {
  if (isEmptyCohort(eventCohort)) {
    return [];
  }

  const deviceWhere = buildDeviceWhere(appId, filters, eventCohort);
  if (deviceWhere.length === 0) {
    return [];
  }

  const result = await db.execute<{ date: string; value: number }>(sql`
    WITH filtered_devices AS (
      SELECT device_id FROM devices
      WHERE ${and(...deviceWhere)}
    ),
    daily AS (
      SELECT
        DATE(s.started_at) AS day,
        s.device_id,
        COUNT(*)::int AS session_count
      FROM sessions_analytics s
      INNER JOIN filtered_devices fd ON s.device_id = fd.device_id
      WHERE s.started_at >= ${dateRange.startDate}::timestamptz
        AND s.started_at <= ${dateRange.endDate}::timestamptz
      GROUP BY DATE(s.started_at), s.device_id
    ),
    date_series AS (
      SELECT DATE(generate_series(
        ${dateRange.startDate}::timestamp,
        ${dateRange.endDate}::timestamp,
        '1 day'::interval
      )) AS date
    )
    SELECT
      ds.date::text AS date,
      COALESCE(AVG(daily.session_count), 0)::float AS value
    FROM date_series ds
    LEFT JOIN daily ON daily.day = ds.date
    GROUP BY ds.date
    ORDER BY ds.date
  `);

  return result.rows.map((row) => ({
    date: row.date,
    value: Number(row.value),
  }));
}

export function resolveBreakdownField(breakdown: {
  type: string;
  field?: string;
}): 'platform' | 'country' | 'city' | 'locale' | null {
  if (breakdown.type === 'device' && breakdown.field) {
    return breakdown.field as 'platform' | 'country' | 'city' | 'locale';
  }
  return null;
}
