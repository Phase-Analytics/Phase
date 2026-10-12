import { count, desc, type SQL, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';

/**
 * One page of devices (newest first) with each device's last session
 * activity. The page is cut before last-seen is resolved, so each returned
 * device costs one probe of sessions_device_last_activity_idx instead of
 * aggregating every session in the database.
 */
export async function getDevicePage(options: {
  where: SQL | undefined;
  limit: number;
  offset: number;
}) {
  const pageRows = db
    .select({
      deviceId: devices.deviceId,
      platform: devices.platform,
      country: devices.country,
      firstSeen: devices.firstSeen,
    })
    .from(devices)
    .where(options.where)
    .orderBy(desc(devices.firstSeen))
    .limit(options.limit)
    .offset(options.offset)
    .as('page_rows');

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        deviceId: pageRows.deviceId,
        platform: pageRows.platform,
        country: pageRows.country,
        firstSeen: pageRows.firstSeen,
        // Qualified by hand: drizzle renders subquery fields unqualified here,
        // which would bind to s.device_id and match every session.
        lastSeen: sql`(
          SELECT max(s.last_activity_at)
          FROM sessions_analytics s
          WHERE s.device_id = "page_rows"."device_id"
        )`.mapWith(sessions.lastActivityAt),
      })
      .from(pageRows)
      .orderBy(desc(pageRows.firstSeen)),
    db.select({ total: count() }).from(devices).where(options.where),
  ]);

  return { rows, total: Number(total) };
}
