import {
  buildExploreEventsSubquery,
  executeQuestDBReadQuery,
} from '@/lib/questdb';
import { EXPLORE_MAX_COHORT_DEVICES } from './constants';
import { ExploreEngineError } from './errors';
import type { ExploreDateRange } from './time-range';

const IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;

function escapeSqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function validateIdentifier(value: string, fieldName: string): void {
  if (!IDENTIFIER_REGEX.test(value)) {
    throw new ExploreEngineError(`Invalid ${fieldName}`);
  }
}

function validateParamKey(key: string): void {
  validateIdentifier(key, 'param key');
}

function validateTimestamp(value: string, fieldName: string): void {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new ExploreEngineError(`Invalid ${fieldName}`);
  }
}

export function buildBaseEventConditions(
  appId: string,
  dateRange: ExploreDateRange,
  extra: string[] = []
): string[] {
  validateIdentifier(appId, 'appId');
  validateTimestamp(dateRange.startDate, 'startDate');
  validateTimestamp(dateRange.endDate, 'endDate');

  return [
    `app_id = '${escapeSqlString(appId)}'`,
    'COALESCE(is_debug, false) = false',
    `timestamp >= '${escapeSqlString(dateRange.startDate)}'`,
    `timestamp <= '${escapeSqlString(dateRange.endDate)}'`,
    ...extra,
  ];
}

export function eventParamExtractSql(paramKey: string): string {
  validateParamKey(paramKey);
  return `cast(json_extract_str(params, '${escapeSqlString(paramKey)}') as double)`;
}

export function buildEventPropertyCondition(
  paramKey: string,
  operator: string,
  value: string | number | boolean | null
): string {
  const extract = eventParamExtractSql(paramKey);

  if (value === null) {
    if (operator === 'eq') {
      return `(${extract} IS NULL OR json_extract_str(params, '${escapeSqlString(paramKey)}') IS NULL)`;
    }
    return `${extract} IS NOT NULL`;
  }

  if (typeof value === 'boolean' || typeof value === 'string') {
    const strExtract = `json_extract_str(params, '${escapeSqlString(paramKey)}')`;
    const escaped = escapeSqlString(String(value).toLowerCase());
    if (operator === 'eq') {
      return `LOWER(${strExtract}) = '${escaped}'`;
    }
    if (operator === 'neq') {
      return `LOWER(${strExtract}) != '${escaped}'`;
    }
    throw new ExploreEngineError(
      `Operator ${operator} not supported for string event params`
    );
  }

  const num = value.toString();
  switch (operator) {
    case 'eq':
      return `${extract} = ${num}`;
    case 'neq':
      return `${extract} != ${num}`;
    case 'gt':
      return `${extract} > ${num}`;
    case 'lt':
      return `${extract} < ${num}`;
    case 'gte':
      return `${extract} >= ${num}`;
    case 'lte':
      return `${extract} <= ${num}`;
    default:
      throw new ExploreEngineError(`Unsupported operator ${operator}`);
  }
}

export async function getDistinctDeviceIdsFromEvents(options: {
  appId: string;
  dateRange: ExploreDateRange;
  conditions: string[];
}): Promise<string[]> {
  const base = buildBaseEventConditions(
    options.appId,
    options.dateRange,
    options.conditions
  );
  const subquery = buildExploreEventsSubquery({
    selectClause: 'CAST(device_id AS VARCHAR) AS device_id',
    conditions: base,
    startDate: options.dateRange.startDate,
    endDate: options.dateRange.endDate,
  });

  const query = `
    SELECT DISTINCT device_id
    FROM (
      ${subquery}
    ) event_rows
    LIMIT ${EXPLORE_MAX_COHORT_DEVICES + 1}
  `;

  const rows = await executeQuestDBReadQuery<{ device_id: string }>(query);

  if (rows.length > EXPLORE_MAX_COHORT_DEVICES) {
    throw new ExploreEngineError(
      `Too many matching users (>${EXPLORE_MAX_COHORT_DEVICES}). Narrow your date range or filters.`,
      400
    );
  }

  return rows.map((row) => row.device_id);
}

export async function runEventsAggregateQuery(options: {
  appId: string;
  dateRange: ExploreDateRange;
  conditions: string[];
  selectMetrics: string;
  havingClause?: string;
}): Promise<Record<string, number | null>> {
  const base = buildBaseEventConditions(
    options.appId,
    options.dateRange,
    options.conditions
  );
  const subquery = buildExploreEventsSubquery({
    selectClause: `
      CAST(device_id AS VARCHAR) AS device_id,
      CAST(name AS VARCHAR) AS name,
      params
    `,
    conditions: base,
    startDate: options.dateRange.startDate,
    endDate: options.dateRange.endDate,
  });

  const having = options.havingClause ? `HAVING ${options.havingClause}` : '';

  const query = `
    SELECT ${options.selectMetrics}
    FROM (
      ${subquery}
    ) event_rows
    ${having}
  `;

  const [row] =
    await executeQuestDBReadQuery<Record<string, number | null>>(query);
  return row ?? {};
}

export async function countEventsInRange(
  appId: string,
  dateRange: ExploreDateRange
): Promise<number> {
  const metrics = await runEventsAggregateQuery({
    appId,
    dateRange,
    conditions: [],
    selectMetrics: 'count(*) AS value',
  });
  return Number(metrics.value ?? 0);
}

export async function getEventParamKeysSample(options: {
  appId: string;
  eventName: string;
}): Promise<string[]> {
  validateIdentifier(options.appId, 'appId');
  validateIdentifier(options.eventName, 'eventName');

  const dateRange: ExploreDateRange = {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  };

  const base = buildBaseEventConditions(options.appId, dateRange, [
    `name = '${escapeSqlString(options.eventName)}'`,
  ]);

  const subquery = buildExploreEventsSubquery({
    selectClause: 'CAST(params AS VARCHAR) AS params',
    conditions: base,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const query = `
    SELECT params
    FROM (
      ${subquery}
    ) event_rows
    WHERE params IS NOT NULL
    LIMIT 100
  `;

  const rows = await executeQuestDBReadQuery<{ params: string }>(query);
  const keys = new Set<string>();

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.params) as Record<string, unknown>;
      for (const key of Object.keys(parsed)) {
        keys.add(key);
      }
    } catch {
      // skip malformed params
    }
  }

  return [...keys].sort();
}
