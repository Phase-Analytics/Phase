import type { ExploreFilter } from '@phase/shared';
import { eq } from 'drizzle-orm';
import { db, devices } from '@/db';
import {
  buildEventPropertyCondition,
  getDistinctDeviceIdsFromEvents,
} from './questdb-helpers';
import type { ExploreDateRange } from './time-range';

function escapeEventName(eventName: string): string {
  return eventName.replace(/'/g, "''");
}

export async function resolveEventCohortDeviceIds(
  appId: string,
  dateRange: ExploreDateRange,
  filters: ExploreFilter[]
): Promise<string[] | null> {
  const eventFilters = filters.filter(
    (f) => f.type === 'event_performed' || f.type === 'event_property'
  );

  if (eventFilters.length === 0) {
    return null;
  }

  let cohort: Set<string> | null = null;

  for (const filter of eventFilters) {
    if (filter.type === 'event_performed') {
      const eventCondition = `name = '${escapeEventName(filter.eventName)}'`;

      if (!filter.performed) {
        const performed = await getDistinctDeviceIdsFromEvents({
          appId,
          dateRange,
          conditions: [eventCondition],
        });
        const performedSet = new Set(performed);
        const allDevices = await db
          .select({ deviceId: devices.deviceId })
          .from(devices)
          .where(eq(devices.appId, appId));
        const notPerformed = allDevices
          .map((row) => row.deviceId)
          .filter((id) => !performedSet.has(id));
        cohort = intersectCohort(cohort, notPerformed);
        continue;
      }

      const ids = await getDistinctDeviceIdsFromEvents({
        appId,
        dateRange,
        conditions: [eventCondition],
      });
      cohort = intersectCohort(cohort, ids);
      continue;
    }

    if (filter.type === 'event_property') {
      const conditions = [
        `name = '${escapeEventName(filter.eventName)}'`,
        buildEventPropertyCondition(filter.key, filter.operator, filter.value),
      ];
      const ids = await getDistinctDeviceIdsFromEvents({
        appId,
        dateRange,
        conditions,
      });
      cohort = intersectCohort(cohort, ids);
    }
  }

  return cohort ? [...cohort] : [];
}

function intersectCohort(
  current: Set<string> | null,
  next: string[]
): Set<string> {
  const nextSet = new Set(next);
  if (current === null) {
    return nextSet;
  }

  return new Set([...current].filter((id) => nextSet.has(id)));
}
