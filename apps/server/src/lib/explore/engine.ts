import type {
  ExploreQueryV1,
  ExploreResult,
  ExploreRunResponse,
} from '@phase/shared';
import {
  buildExploreEventsSubquery,
  executeQuestDBReadQuery,
} from '@/lib/questdb';
import { resolveEventCohortDeviceIds } from './cohort';
import { EXPLORE_MAX_BREAKDOWN_ROWS } from './constants';
import { ExploreEngineError } from './errors';
import {
  avgSessionDurationForExplore,
  breakdownDevicesForExplore,
  countDevicesForExplore,
  countSessionsForExplore,
  isEmptyCohort,
  resolveBreakdownField,
  sessionsPerUserTimeseriesForExplore,
} from './postgres-helpers';
import {
  buildBaseEventConditions,
  buildEventPropertyCondition,
  eventParamExtractSql,
  getDistinctDeviceIdsFromEvents,
  runEventsAggregateQuery,
} from './questdb-helpers';
import { buildExploreCoverage } from './coverage';
import { resolveExploreDateRange } from './time-range';
import { validateExploreQuery } from './validate';

function escapeSqlString(value: string): string {
  return value.replace(/\\/g, "''");
}

function buildEventFilterConditions(
  _appId: string,
  _dateRange: ReturnType<typeof resolveExploreDateRange>,
  filters: ExploreQueryV1['filters'],
  eventName?: string
): string[] {
  const conditions: string[] = [];

  if (eventName) {
    conditions.push(`name = '${escapeSqlString(eventName)}'`);
  }

  for (const filter of filters) {
    if (filter.type === 'event_property') {
      if (eventName && filter.eventName !== eventName) {
        continue;
      }
      conditions.push(`name = '${escapeSqlString(filter.eventName)}'`);
      conditions.push(
        buildEventPropertyCondition(filter.key, filter.operator, filter.value)
      );
    }
  }

  return conditions;
}

async function runEventsGrainQuery(
  appId: string,
  query: ExploreQueryV1,
  dateRange: ReturnType<typeof resolveExploreDateRange>
): Promise<ExploreResult> {
  const eventName =
    query.metric.field?.kind === 'event_param'
      ? query.metric.field.eventName
      : query.filters.find((f) => f.type === 'event_performed')?.eventName;

  const baseConditions = buildBaseEventConditions(appId, dateRange);
  const filterConditions = buildEventFilterConditions(
    appId,
    dateRange,
    query.filters,
    eventName
  );
  const allConditions = [...baseConditions, ...filterConditions];

  const { aggregation } = query.metric;

  if (query.breakdown?.type === 'event_name') {
    const subquery = buildExploreEventsSubquery({
      selectClause: 'CAST(name AS VARCHAR) AS name',
      conditions: allConditions,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    const sql = `
      SELECT name AS dimension, COUNT(*) AS value
      FROM (${subquery}) event_rows
      GROUP BY name
      ORDER BY value DESC
      LIMIT ${EXPLORE_MAX_BREAKDOWN_ROWS}
    `;

    const rows = await executeQuestDBReadQuery<{
      dimension: string;
      value: number;
    }>(sql);

    return {
      kind: 'breakdown',
      rows: rows.map((r) => ({
        dimension: r.dimension,
        value: Number(r.value),
      })),
    };
  }

  if (
    aggregation === 'field_summary' &&
    query.metric.field?.kind === 'event_param'
  ) {
    const extract = eventParamExtractSql(query.metric.field.paramKey);
    const metrics = await runEventsAggregateQuery({
      appId,
      dateRange,
      conditions: allConditions,
      selectMetrics: `
        count(*) AS cnt,
        avg(${extract}) AS avg_val,
        min(${extract}) AS min_val,
        max(${extract}) AS max_val
      `,
      havingClause: `${extract} IS NOT NULL`,
    });

    return {
      kind: 'percentiles',
      rows: [
        { label: 'Count', value: Number(metrics.cnt ?? 0) },
        { label: 'Average', value: Number(metrics.avg_val ?? 0) },
        { label: 'Min', value: Number(metrics.min_val ?? 0) },
        { label: 'Max', value: Number(metrics.max_val ?? 0) },
      ],
    };
  }

  if (
    aggregation === 'avg' ||
    aggregation === 'min' ||
    aggregation === 'max' ||
    aggregation === 'sum'
  ) {
    if (query.metric.field?.kind !== 'event_param') {
      throw new ExploreEngineError('Aggregation requires an event param field');
    }

    const extract = eventParamExtractSql(query.metric.field.paramKey);
    const aggFn = aggregation.toUpperCase();
    const metrics = await runEventsAggregateQuery({
      appId,
      dateRange,
      conditions: allConditions,
      selectMetrics: `${aggFn}(${extract}) AS value`,
      havingClause: `${extract} IS NOT NULL`,
    });

    return {
      kind: 'scalar',
      value: Number(metrics.value ?? 0),
      label: aggregation,
    };
  }

  if (aggregation === 'count_distinct_users') {
    const ids = await getDistinctDeviceIdsFromEvents({
      appId,
      dateRange,
      conditions: filterConditions,
    });
    return {
      kind: 'scalar',
      value: ids.length,
      label: 'Distinct users',
    };
  }

  const metrics = await runEventsAggregateQuery({
    appId,
    dateRange,
    conditions: allConditions,
    selectMetrics: 'count(*) AS value',
  });

  return {
    kind: 'scalar',
    value: Number(metrics.value ?? 0),
    label: 'Event count',
  };
}

async function runUsersGrainQuery(
  appId: string,
  query: ExploreQueryV1,
  dateRange: ReturnType<typeof resolveExploreDateRange>
): Promise<ExploreResult> {
  const eventCohort = await resolveEventCohortDeviceIds(
    appId,
    dateRange,
    query.filters
  );

  if (isEmptyCohort(eventCohort)) {
    return emptyResultForQuery(query);
  }

  if (
    query.metric.aggregation === 'sessions_per_user' &&
    query.groupBy === 'day'
  ) {
    const points = await sessionsPerUserTimeseriesForExplore(
      appId,
      query.filters,
      eventCohort,
      dateRange
    );
    return { kind: 'timeseries', points };
  }

  if (query.breakdown) {
    const field = resolveBreakdownField(query.breakdown);
    if (!field) {
      throw new ExploreEngineError('Unsupported breakdown for users grain');
    }
    const rows = await breakdownDevicesForExplore(
      appId,
      query.filters,
      eventCohort,
      field
    );
    return { kind: 'breakdown', rows };
  }

  const total = await countDevicesForExplore(appId, query.filters, eventCohort);
  return {
    kind: 'scalar',
    value: total,
    label: 'Users',
  };
}

async function runSessionsGrainQuery(
  appId: string,
  query: ExploreQueryV1,
  dateRange: ReturnType<typeof resolveExploreDateRange>
): Promise<ExploreResult> {
  const eventCohort = await resolveEventCohortDeviceIds(
    appId,
    dateRange,
    query.filters
  );

  if (isEmptyCohort(eventCohort)) {
    return emptyResultForQuery(query);
  }

  if (
    query.metric.aggregation === 'avg' &&
    query.metric.field?.kind === 'session_duration'
  ) {
    const avg = await avgSessionDurationForExplore(
      appId,
      query.filters,
      eventCohort,
      dateRange
    );
    return {
      kind: 'scalar',
      value: avg,
      label: 'Avg session duration (s)',
    };
  }

  if (query.breakdown) {
    const field = resolveBreakdownField(query.breakdown);
    if (!field) {
      throw new ExploreEngineError('Unsupported breakdown for sessions grain');
    }
    const rows = await breakdownDevicesForExplore(
      appId,
      query.filters,
      eventCohort,
      field
    );
    return { kind: 'breakdown', rows };
  }

  const total = await countSessionsForExplore(
    appId,
    query.filters,
    eventCohort,
    dateRange
  );
  return {
    kind: 'scalar',
    value: total,
    label: 'Sessions',
  };
}

function emptyResultForQuery(query: ExploreQueryV1): ExploreResult {
  if (query.groupBy === 'day') {
    return { kind: 'timeseries', points: [] };
  }
  if (query.breakdown) {
    return { kind: 'breakdown', rows: [] };
  }
  return { kind: 'scalar', value: 0, label: 'No data' };
}

export async function runExploreQuery(
  appId: string,
  query: ExploreQueryV1
): Promise<ExploreRunResponse> {
  validateExploreQuery(query);
  const dateRange = resolveExploreDateRange(query.timeRange);

  let result: ExploreResult;

  switch (query.grain) {
    case 'events':
      result = await runEventsGrainQuery(appId, query, dateRange);
      break;
    case 'users':
      result = await runUsersGrainQuery(appId, query, dateRange);
      break;
    case 'sessions':
      result = await runSessionsGrainQuery(appId, query, dateRange);
      break;
    default:
      throw new ExploreEngineError('Unsupported grain');
  }

  const rowCount =
    result.kind === 'breakdown'
      ? result.rows.length
      : result.kind === 'timeseries'
        ? result.points.length
        : result.kind === 'percentiles'
          ? result.rows.length
          : 1;

  const coverage = await buildExploreCoverage(
    appId,
    query,
    dateRange,
    result
  );

  return {
    result,
    meta: {
      generatedAt: new Date().toISOString(),
      rowCount,
      coverage,
    },
  };
}
