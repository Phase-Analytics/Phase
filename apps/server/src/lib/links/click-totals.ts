import { executeQuestDBReadQuery } from '@/lib/questdb';
import { escapeQuestDbString } from '@/lib/questdb-sql';
import { QUESTDB_LINK_CLICKS_TABLE } from './constants';
import { getLinksRedis, logLinkRedisFailure } from './redis';

/**
 * All-time click totals per link, kept in Redis so the links list does not
 * run a full-history GROUP BY on every load. A counter is seeded from QuestDB
 * the first time it is read and afterwards only incremented when a click is
 * persisted. Counters for links that were never listed are not created.
 */
const TOTAL_KEY_PREFIX = 'link:clicks:total:';
const QUESTDB_ID_CHUNK = 200;

const INCREMENT_IF_SEEDED_SCRIPT = `
  if redis.call('EXISTS', KEYS[1]) == 1 then
    return redis.call('INCRBY', KEYS[1], ARGV[1])
  end
  return false
`;

function totalKey(linkId: string): string {
  return `${TOTAL_KEY_PREFIX}${linkId}`;
}

export async function incrementLinkClickTotals(
  linkIds: string[]
): Promise<void> {
  const redis = getLinksRedis();
  if (!redis || linkIds.length === 0) {
    return;
  }

  const counts = new Map<string, number>();
  for (const linkId of linkIds) {
    counts.set(linkId, (counts.get(linkId) ?? 0) + 1);
  }

  const pipeline = redis.pipeline();
  for (const [linkId, count] of counts) {
    pipeline.eval(INCREMENT_IF_SEEDED_SCRIPT, 1, totalKey(linkId), count);
  }
  await pipeline.exec();
}

export async function deleteLinkClickTotals(linkIds: string[]): Promise<void> {
  const redis = getLinksRedis();
  if (!redis || linkIds.length === 0) {
    return;
  }
  try {
    await redis.del(...linkIds.map(totalKey));
  } catch (error) {
    logLinkRedisFailure('click total delete', error);
  }
}

async function countClicksFromQuestDb(
  appId: string,
  linkIds: string[]
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  for (let i = 0; i < linkIds.length; i += QUESTDB_ID_CHUNK) {
    const chunk = linkIds.slice(i, i + QUESTDB_ID_CHUNK);
    const idList = chunk.map((id) => `'${escapeQuestDbString(id)}'`).join(',');
    const rows = await executeQuestDBReadQuery<{
      link_id: string;
      total_clicks: number;
    }>(`
      SELECT link_id, count() AS total_clicks
      FROM ${QUESTDB_LINK_CLICKS_TABLE}
      WHERE app_id = '${escapeQuestDbString(appId)}' AND link_id IN (${idList})
      GROUP BY link_id
    `);
    for (const row of rows) {
      totals.set(row.link_id, Number(row.total_clicks ?? 0));
    }
  }
  return totals;
}

/** Throws when QuestDB is needed and unavailable; never reports a fake 0. */
export async function getLinkClickTotals(
  appId: string,
  linkIds: string[]
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (linkIds.length === 0) {
    return totals;
  }

  const redis = getLinksRedis();
  let missing = linkIds;
  let canSeed = false;

  if (redis) {
    try {
      const values = await redis.mget(...linkIds.map(totalKey));
      missing = [];
      linkIds.forEach((linkId, index) => {
        const value = values[index];
        if (value === null || value === undefined) {
          missing.push(linkId);
        } else {
          totals.set(linkId, Number(value));
        }
      });
      canSeed = true;
    } catch (error) {
      logLinkRedisFailure('click total read', error);
    }
  }

  if (missing.length === 0) {
    return totals;
  }

  const counted = await countClicksFromQuestDb(appId, missing);
  for (const linkId of missing) {
    totals.set(linkId, counted.get(linkId) ?? 0);
  }

  if (redis && canSeed) {
    const pipeline = redis.pipeline();
    for (const linkId of missing) {
      pipeline.set(totalKey(linkId), counted.get(linkId) ?? 0, 'NX');
    }
    pipeline.exec().catch((error) => {
      logLinkRedisFailure('click total seed', error);
    });
  }

  return totals;
}
