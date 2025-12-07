import { sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import type { OnlineUsers } from '@/schemas';

const ACTIVE_SESSION_THRESHOLD_MS = 1 * 60 * 1000;

export async function getOnlineUsers(appId: string): Promise<OnlineUsers> {
  const thresholdDate = new Date(Date.now() - ACTIVE_SESSION_THRESHOLD_MS);

  const result = await db
    .select({
      deviceId: devices.deviceId,
      platform: devices.platform,
      country: devices.country,
    })
    .from(sessions)
    .innerJoin(devices, sql`${sessions.deviceId} = ${devices.deviceId}`)
    .where(
      sql`${devices.appId} = ${appId} AND ${sessions.lastActivityAt} >= ${thresholdDate}`
    );

  const deviceIds = [...new Set(result.map((r) => r.deviceId))];

  const platformCounts: Record<string, number> = {};
  for (const row of result) {
    if (row.platform) {
      platformCounts[row.platform] = (platformCounts[row.platform] || 0) + 1;
    }
  }

  const countryCounts: Record<string, number> = {};
  for (const row of result) {
    if (row.country) {
      countryCounts[row.country] = (countryCounts[row.country] || 0) + 1;
    }
  }

  return {
    total: deviceIds.length,
    devices: deviceIds,
    platforms: platformCounts,
    countries: countryCounts,
  };
}
