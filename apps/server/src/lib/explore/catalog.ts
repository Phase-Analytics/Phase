import type { ExploreCatalogResponse } from '@phase/shared';
import { sql } from 'drizzle-orm';
import { db, devices } from '@/db';
import {
  buildExploreEventsSubquery,
  executeQuestDBReadQuery,
  getTopEvents,
} from '@/lib/questdb';
import { escapeQuestDbString } from '@/lib/questdb-sql';
import {
  EXPLORE_CATALOG_EVENT_LIMIT,
  EXPLORE_CATALOG_PARAM_SAMPLE_LIMIT,
} from './constants';

async function getEventParamKeysSample(
  appId: string,
  eventName: string
): Promise<string[]> {
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const subquery = buildExploreEventsSubquery({
    selectClause: 'CAST(params AS VARCHAR) AS params',
    conditions: [
      `app_id = '${escapeQuestDbString(appId)}'`,
      `name = '${escapeQuestDbString(eventName)}'`,
      'COALESCE(is_debug, false) = false',
    ],
    startDate,
    endDate,
  });

  const rows = await executeQuestDBReadQuery<{ params: string }>(`
    SELECT params
    FROM (${subquery}) event_rows
    WHERE params IS NOT NULL
    LIMIT ${EXPLORE_CATALOG_PARAM_SAMPLE_LIMIT}
  `);

  const keys = new Set<string>();
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.params) as Record<string, unknown>;
      for (const key of Object.keys(parsed)) {
        keys.add(key);
      }
    } catch {
      // skip invalid JSON
    }
  }

  return [...keys].sort((a, b) => a.localeCompare(b));
}

export async function getExploreCatalog(
  appId: string,
  eventNameForParams?: string
): Promise<ExploreCatalogResponse> {
  const [{ events }, platformRows, countryRows] = await Promise.all([
    getTopEvents({ appId, limit: EXPLORE_CATALOG_EVENT_LIMIT }),
    db
      .selectDistinct({ platform: devices.platform })
      .from(devices)
      .where(
        sql`${devices.appId} = ${appId} AND ${devices.platform} IS NOT NULL`
      ),
    db
      .selectDistinct({ country: devices.country })
      .from(devices)
      .where(
        sql`${devices.appId} = ${appId} AND ${devices.country} IS NOT NULL`
      ),
  ]);

  const paramKeysByEvent: Record<string, string[]> = {};

  if (eventNameForParams) {
    paramKeysByEvent[eventNameForParams] = await getEventParamKeysSample(
      appId,
      eventNameForParams
    );
  }

  return {
    eventNames: events.map((e) => e.name),
    deviceFields: {
      platforms: platformRows
        .map((r) => r.platform)
        .filter((p): p is string => Boolean(p)),
      countries: countryRows
        .map((r) => r.country)
        .filter((c): c is string => Boolean(c)),
    },
    paramKeysByEvent,
  };
}
