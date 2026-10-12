import {
  appCondition,
  buildEventReadUnion,
  dateRangeConditions,
  escapeSqlString,
  executeQuery,
  sanitizeNumeric,
  timestampLiteral,
} from '@/lib/questdb-client';
import { cachedRead, READ_CACHE_TTL } from '@/lib/read-cache';
import {
  type DayRange,
  dayRangeCacheParams,
  resolveDayRange,
} from '@/lib/reports/day-range';

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE_REGEX = /^[A-Za-z0-9_+\-/]+$/;

/** Advertised as maxBreakdownLimit by the public API. */
export const TOP_EVENTS_MAX_LIMIT = 50;

export type TopEventQueryResult = {
  name: string;
  count: number;
};

export type GetTopEventsOptions = {
  appId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
};

function queryTopEventsByType(
  options: GetTopEventsOptions,
  isScreen: boolean
): Promise<TopEventQueryResult[]> {
  const conditions = [
    appCondition(options.appId),
    `is_screen = ${isScreen}`,
    ...dateRangeConditions(options.startDate, options.endDate),
  ];
  const limit = sanitizeNumeric(options.limit, 10, 1, TOP_EVENTS_MAX_LIMIT);

  return cachedRead(
    {
      appId: options.appId,
      scope: isScreen ? 'events:top-screens' : 'events:top-events',
      params: { startDate: options.startDate, endDate: options.endDate, limit },
      ttlSeconds: READ_CACHE_TTL.standard,
    },
    async () => {
      // Aggregating per table keeps QuestDB's parallel keyed GROUP BY.
      const rows = await executeQuery<TopEventQueryResult>(`
        SELECT CAST(name AS VARCHAR) AS name, sum(count) AS count
        FROM (
          ${buildEventReadUnion('name, count() AS count', conditions)}
        ) branch_counts
        GROUP BY name
        ORDER BY count DESC, name
        LIMIT ${limit}
      `);
      return rows.map((row) => ({ name: row.name, count: Number(row.count) }));
    }
  );
}

export async function getTopEvents(
  options: GetTopEventsOptions
): Promise<{ events: TopEventQueryResult[]; screens: TopEventQueryResult[] }> {
  const [events, screens] = await Promise.all([
    queryTopEventsByType(options, false),
    queryTopEventsByType(options, true),
  ]);

  return { events, screens };
}

export function getTopScreens(
  options: GetTopEventsOptions
): Promise<TopEventQueryResult[]> {
  return queryTopEventsByType(options, true);
}

export type EventStats = {
  totalEvents: number;
  events24h: number;
  totalEventsChange24h: number;
  events24hChange: number;
};

type EventStatsRow = {
  total: number | null;
  last_24h: number | null;
  previous_24h: number | null;
};

/** Non-debug event KPIs in one pass over each storage table. */
export function getEventStats(options: { appId: string }): Promise<EventStats> {
  const conditions = [appCondition(options.appId)];

  return cachedRead(
    {
      appId: options.appId,
      scope: 'events:overview',
      params: {},
      ttlSeconds: READ_CACHE_TTL.short,
    },
    async () => {
      const now = Date.now();
      const since24h = timestampLiteral(new Date(now - DAY_MS));
      const since48h = timestampLiteral(new Date(now - 2 * DAY_MS));

      const [row] = await executeQuery<EventStatsRow>(`
        SELECT
          sum(total) AS total,
          sum(last_24h) AS last_24h,
          sum(previous_24h) AS previous_24h
        FROM (
          ${buildEventReadUnion(
            `count() AS total,
            sum(CASE WHEN timestamp >= ${since24h} THEN 1 ELSE 0 END) AS last_24h,
            sum(CASE WHEN timestamp >= ${since48h} AND timestamp < ${since24h} THEN 1 ELSE 0 END) AS previous_24h`,
            conditions
          )}
        ) branch_stats
      `);

      const events24h = Number(row?.last_24h ?? 0);
      return {
        totalEvents: Number(row?.total ?? 0),
        events24h,
        // total now minus total 24h ago: exactly the events of the last 24h
        totalEventsChange24h: events24h,
        events24hChange: events24h - Number(row?.previous_24h ?? 0),
      };
    }
  );
}

export type EventTimeseriesDataPoint = {
  date: string;
  dailyEvents: number;
};

export type GetEventTimeseriesOptions = {
  appId: string;
  startDate?: string;
  endDate?: string;
  timeZone: string;
};

async function queryDailyEventCounts(
  appId: string,
  range: DayRange
): Promise<Map<string, number>> {
  if (!TIME_ZONE_REGEX.test(range.timeZone)) {
    throw new Error('Invalid time zone');
  }
  const zone = escapeSqlString(range.timeZone);
  const conditions = [
    appCondition(appId),
    `timestamp >= ${timestampLiteral(range.scanStart)}`,
    `timestamp < ${timestampLiteral(range.scanEnd)}`,
  ];

  // SAMPLE BY needs the designated timestamp, so each table is bucketed on
  // its own; the bucket key is the local date of the bucket start.
  const rows = await executeQuery<{ day: string; count: number }>(`
    SELECT day, sum(count) AS count
    FROM (
      ${buildEventReadUnion(
        `to_str(to_timezone(timestamp, '${zone}'), 'yyyy-MM-dd') AS day, count() AS count`,
        conditions,
        { branchSuffix: `SAMPLE BY 1d ALIGN TO CALENDAR TIME ZONE '${zone}'` }
      )}
    ) daily
    GROUP BY day
  `);
  return new Map(rows.map((row) => [row.day, Number(row.count)]));
}

/** Non-debug events per local calendar day in `timeZone`, zero-filled. */
export async function getEventTimeseries(
  options: GetEventTimeseriesOptions
): Promise<{
  data: EventTimeseriesDataPoint[];
  period: { startDate: string; endDate: string };
}> {
  const range = resolveDayRange({
    startDate: options.startDate,
    endDate: options.endDate,
    defaultDays: 7,
    timeZone: options.timeZone,
  });

  const data = await cachedRead(
    {
      appId: options.appId,
      scope: 'events:daily',
      params: dayRangeCacheParams(range),
      ttlSeconds: READ_CACHE_TTL.standard,
    },
    async () => {
      const counts = await queryDailyEventCounts(options.appId, range);
      return range.days.map((date) => ({
        date,
        dailyEvents: counts.get(date) ?? 0,
      }));
    }
  );

  return { data, period: range.period };
}
