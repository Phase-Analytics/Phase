import type { ExploreCatalogResponse } from '@phase/shared';
import { sql } from 'drizzle-orm';
import { db, devices } from '@/db';
import { getTopEvents } from '@/lib/questdb';
import { EXPLORE_CATALOG_EVENT_LIMIT } from './constants';
import { getEventParamKeysSample } from './questdb-helpers';

export async function getExploreCatalog(
  appId: string,
  eventNameForParams?: string
): Promise<ExploreCatalogResponse> {
  const [{ events }, platformRows, countryRows] = await Promise.all([
    getTopEvents({ appId, limit: EXPLORE_CATALOG_EVENT_LIMIT }),
    db
      .selectDistinct({ platform: devices.platform })
      .from(devices)
      .where(sql`${devices.appId} = ${appId} AND ${devices.platform} IS NOT NULL`),
    db
      .selectDistinct({ country: devices.country })
      .from(devices)
      .where(sql`${devices.appId} = ${appId} AND ${devices.country} IS NOT NULL`),
  ]);

  const paramKeysByEvent: Record<string, string[]> = {};

  if (eventNameForParams) {
    paramKeysByEvent[eventNameForParams] = await getEventParamKeysSample({
      appId,
      eventName: eventNameForParams,
    });
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
