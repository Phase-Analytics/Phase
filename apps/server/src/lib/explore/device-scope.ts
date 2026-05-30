import type { ExploreFilter } from '@phase/shared';
import { and } from 'drizzle-orm';
import { db, devices } from '@/db';
import { resolveEventCohortDeviceIds } from './cohort';
import { EXPLORE_MAX_COHORT_DEVICES } from './constants';
import { ExploreEngineError } from './errors';
import { buildDeviceWhere, isEmptyCohort } from './postgres-helpers';
import type { ExploreDateRange } from './time-range';

export async function listDeviceIdsForExplore(
  appId: string,
  filters: ExploreFilter[],
  eventCohort: string[] | null
): Promise<string[]> {
  const whereParts = buildDeviceWhere(appId, filters, eventCohort);
  if (whereParts.length === 0) {
    return [];
  }

  const rows = await db
    .select({ deviceId: devices.deviceId })
    .from(devices)
    .where(and(...whereParts))
    .limit(EXPLORE_MAX_COHORT_DEVICES + 1);

  if (rows.length > EXPLORE_MAX_COHORT_DEVICES) {
    throw new ExploreEngineError(
      `Too many matching devices (>${EXPLORE_MAX_COHORT_DEVICES}). Narrow filters or date range.`,
      400
    );
  }

  return rows.map((row) => row.deviceId);
}

export async function resolveQuestDbDeviceIds(
  appId: string,
  dateRange: ExploreDateRange,
  filters: ExploreFilter[]
): Promise<string[] | null> {
  const eventCohort = await resolveEventCohortDeviceIds(
    appId,
    dateRange,
    filters
  );

  if (isEmptyCohort(eventCohort)) {
    return [];
  }

  const hasDeviceFilter = filters.some(
    (filter) => filter.type === 'device' || filter.type === 'device_property'
  );

  if (!hasDeviceFilter && eventCohort === null) {
    return null;
  }

  if (!hasDeviceFilter && eventCohort !== null) {
    return eventCohort;
  }

  return listDeviceIdsForExplore(appId, filters, eventCohort);
}

export function deviceIdSqlCondition(deviceIds: string[] | null): string[] {
  if (deviceIds === null) {
    return [];
  }

  if (deviceIds.length === 0) {
    return ['1 = 0'];
  }

  const escaped = deviceIds
    .map((id) => `'${id.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`)
    .join(', ');

  return [`device_id IN (${escaped})`];
}
