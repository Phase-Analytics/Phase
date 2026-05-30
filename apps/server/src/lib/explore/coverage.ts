import type {
  ExploreCoverage,
  ExploreQueryV1,
  ExploreResult,
} from '@phase/shared';
import { resolveEventCohortDeviceIds } from './cohort';
import {
  countDevicesForExplore,
  countSessionsForExplore,
} from './postgres-helpers';
import { countEventsInRange } from './questdb-helpers';
import type { ExploreDateRange } from './time-range';

async function countAllSessionsInRange(
  appId: string,
  dateRange: ExploreDateRange
): Promise<number> {
  return countSessionsForExplore(appId, [], null, dateRange);
}

function matchedFromResult(result: ExploreResult): number | null {
  if (result.kind === 'scalar') {
    return result.value;
  }
  if (result.kind === 'breakdown') {
    return result.rows.reduce((sum, row) => sum + row.value, 0);
  }
  if (result.kind === 'percentiles') {
    const countRow = result.rows.find((row) => row.label === 'Count');
    return countRow ? countRow.value : null;
  }
  return null;
}

export async function buildExploreCoverage(
  appId: string,
  query: ExploreQueryV1,
  dateRange: ExploreDateRange,
  result: ExploreResult
): Promise<ExploreCoverage | undefined> {
  const hasEventOrDeviceFilters = query.filters.length > 0;

  if (query.grain === 'users') {
    const evaluated = await countDevicesForExplore(appId, [], null);
    const eventCohort = await resolveEventCohortDeviceIds(
      appId,
      dateRange,
      query.filters
    );
    const matched = await countDevicesForExplore(
      appId,
      query.filters,
      eventCohort
    );

    if (!hasEventOrDeviceFilters && query.breakdown) {
      return { evaluated, matched: evaluated, unit: 'devices' };
    }
    if (!hasEventOrDeviceFilters) {
      return undefined;
    }

    return { evaluated, matched, unit: 'devices' };
  }

  if (query.grain === 'sessions') {
    const evaluated = await countAllSessionsInRange(appId, dateRange);
    const eventCohort = await resolveEventCohortDeviceIds(
      appId,
      dateRange,
      query.filters
    );
    const matched = await countSessionsForExplore(
      appId,
      query.filters,
      eventCohort,
      dateRange
    );

    if (!hasEventOrDeviceFilters) {
      return undefined;
    }

    return { evaluated, matched, unit: 'sessions' };
  }

  if (query.grain === 'events') {
    const evaluated = await countEventsInRange(appId, dateRange);
    const matched = matchedFromResult(result);

    if (matched === null || !hasEventOrDeviceFilters) {
      return undefined;
    }

    return { evaluated, matched, unit: 'events' };
  }

  return undefined;
}
