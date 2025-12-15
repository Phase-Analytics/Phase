import type { OnlineUsers } from '@phase/shared';
import { sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';

const ACTIVE_SESSION_THRESHOLD_MS = 60_000;

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

  const uniqueDevices = new Map<
    string,
    { platform: string | null; country: string | null }
  >();

  for (const row of result) {
    if (!uniqueDevices.has(row.deviceId)) {
      uniqueDevices.set(row.deviceId, {
        platform: row.platform,
        country: row.country,
      });
    }
  }

  const platformCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};

  for (const device of uniqueDevices.values()) {
    if (device.platform) {
      platformCounts[device.platform] =
        (platformCounts[device.platform] || 0) + 1;
    }
    if (device.country) {
      countryCounts[device.country] = (countryCounts[device.country] || 0) + 1;
    }
  }

  return {
    total: uniqueDevices.size,
    platforms: platformCounts,
    countries: countryCounts,
  };
}
