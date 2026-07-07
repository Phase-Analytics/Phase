import type { ExploreFilter, PropertySearchCondition } from '@phase/shared';
import { and, count, eq, gte, inArray, lte, type SQL, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import { buildPropertySearchFilters } from '@/lib/property-search';
import { SESSION_MIN_DURATION_SECONDS } from '@/lib/validators';
import { EXPLORE_MAX_BREAKDOWN_ROWS } from './constants';
import type { ExploreDateRange } from './time-range';

function deviceColumn(field: 'platform' | 'country' | 'city' | 'locale') {
  if (field === 'platform') {
    return devices.platform;
  }
  if (field === 'country') {
    return devices.country;
  }
  if (field === 'city') {
    return devices.city;
  }
  return devices.locale;
}

function deviceFiltersFromExplore(filters: ExploreFilter[]): SQL[] {
  const sqlFilters: SQL[] = [];

  for (const filter of filters) {
    if (filter.type === 'device') {
      const column = deviceColumn(filter.field);

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

export function buildDeviceWhere(
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

  const column = deviceColumn(field);

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
    sql`EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})) >= ${SESSION_MIN_DURATION_SECONDS}`,
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

export async function avgSessionDurationTimeseriesForExplore(
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
    daily_durations AS (
      SELECT
        DATE(s.started_at) AS day,
        EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))::float AS duration_s
      FROM sessions_analytics s
      INNER JOIN filtered_devices fd ON s.device_id = fd.device_id
      WHERE s.started_at >= ${dateRange.startDate}::timestamptz
        AND s.started_at <= ${dateRange.endDate}::timestamptz
        AND EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at)) >= ${SESSION_MIN_DURATION_SECONDS}
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
      COALESCE(AVG(daily_durations.duration_s), 0)::float AS value
    FROM date_series ds
    LEFT JOIN daily_durations ON daily_durations.day = ds.date
    GROUP BY ds.date
    ORDER BY ds.date
  `);

  return result.rows.map((row) => ({
    date: row.date,
    value: Number(row.value),
  }));
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
        AND EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at)) >= ${SESSION_MIN_DURATION_SECONDS}
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

export async function breakdownDevicesPairForExplore(
  appId: string,
  filters: ExploreFilter[],
  eventCohort: string[] | null,
  fields: [
    'platform' | 'country' | 'city' | 'locale',
    'platform' | 'country' | 'city' | 'locale',
  ]
): Promise<Array<{ dimension: string; value: number }>> {
  const whereParts = buildDeviceWhere(appId, filters, eventCohort);
  if (whereParts.length === 0) {
    return [];
  }

  const columnA = deviceColumn(fields[0]);
  const columnB = deviceColumn(fields[1]);

  const rows = await db
    .select({
      dimension: sql<string>`COALESCE(${columnA}, 'unknown') || ' · ' || COALESCE(${columnB}, 'unknown')`,
      value: count(),
    })
    .from(devices)
    .where(and(...whereParts))
    .groupBy(columnA, columnB)
    .orderBy(sql`count(*) DESC`)
    .limit(EXPLORE_MAX_BREAKDOWN_ROWS);

  return rows.map((row) => ({
    dimension: row.dimension,
    value: Number(row.value),
  }));
}

export async function sessionCountTimeseriesForExplore(
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
    daily_counts AS (
      SELECT
        DATE(s.started_at) AS day,
        COUNT(*)::int AS session_count
      FROM sessions_analytics s
      INNER JOIN filtered_devices fd ON s.device_id = fd.device_id
      WHERE s.started_at >= ${dateRange.startDate}::timestamptz
        AND s.started_at <= ${dateRange.endDate}::timestamptz
        AND EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at)) >= ${SESSION_MIN_DURATION_SECONDS}
      GROUP BY DATE(s.started_at)
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
      COALESCE(daily_counts.session_count, 0)::float AS value
    FROM date_series ds
    LEFT JOIN daily_counts ON daily_counts.day = ds.date
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

export function resolveBreakdownPair(breakdown: {
  type: string;
  fields?: readonly string[];
}):
  | [
      'platform' | 'country' | 'city' | 'locale',
      'platform' | 'country' | 'city' | 'locale',
    ]
  | null {
  if (breakdown.type === 'device_pair' && breakdown.fields?.length === 2) {
    return breakdown.fields as [
      'platform' | 'country' | 'city' | 'locale',
      'platform' | 'country' | 'city' | 'locale',
    ];
  }
  return null;
}
