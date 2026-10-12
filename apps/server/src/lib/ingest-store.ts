import type { CreateDeviceRequest } from '@phase/shared';
import { and, eq, getTableColumns, gt, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import { getLocationFromIP } from './geolocation';

export type DeviceRow = typeof devices.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;

export type DeviceUpsertResult =
  | { status: 'ok'; device: DeviceRow; inserted: boolean }
  | { status: 'forbidden' };

export type SessionCreateResult =
  | { status: 'ok'; session: SessionRow; inserted: boolean }
  | { status: 'foreign-device' };

const mergedProperties = sql`CASE
  WHEN excluded.properties IS NULL THEN devices.properties
  ELSE COALESCE(devices.properties, '{}'::jsonb) || excluded.properties
END`;

// Only rewrite the row when a value actually changes; an unchanged returning
// device then costs no new tuple (and no WAL / index churn).
const deviceChanged = sql`devices.app_id = excluded.app_id AND (
  devices.os_version IS DISTINCT FROM COALESCE(excluded.os_version, devices.os_version)
  OR devices.platform IS DISTINCT FROM COALESCE(excluded.platform, devices.platform)
  OR devices.locale IS DISTINCT FROM COALESCE(excluded.locale, devices.locale)
  OR devices.model IS DISTINCT FROM COALESCE(excluded.model, devices.model)
  OR devices.properties IS DISTINCT FROM ${mergedProperties}
)`;

/**
 * Inserts the device or merges non-null fields into the existing row in a
 * single statement, so concurrent first-seen requests cannot race into a
 * unique violation. Country is resolved only for new devices.
 */
export async function upsertDevice(
  payload: CreateDeviceRequest,
  appId: string,
  ip: string | null
): Promise<DeviceUpsertResult> {
  const country =
    ip && !payload.disableGeolocation
      ? getLocationFromIP(ip).countryCode
      : null;

  const [row] = await db
    .insert(devices)
    .values({
      deviceId: payload.deviceId,
      appId,
      osVersion: payload.osVersion ?? null,
      platform: payload.platform ?? null,
      locale: payload.locale ?? null,
      model: payload.model ?? null,
      country,
      properties: payload.properties ?? null,
    })
    .onConflictDoUpdate({
      target: devices.deviceId,
      set: {
        osVersion: sql`COALESCE(excluded.os_version, devices.os_version)`,
        platform: sql`COALESCE(excluded.platform, devices.platform)`,
        locale: sql`COALESCE(excluded.locale, devices.locale)`,
        model: sql`COALESCE(excluded.model, devices.model)`,
        properties: mergedProperties,
      },
      setWhere: deviceChanged,
    })
    .returning({
      ...getTableColumns(devices),
      inserted: sql<boolean>`(xmax = 0)`,
    });

  if (row) {
    const { inserted, ...device } = row;
    return { status: 'ok', device, inserted };
  }

  // Conflict without update: either nothing changed or the device belongs to
  // another app. Both need the current row.
  const existing = await db.query.devices.findFirst({
    where: eq(devices.deviceId, payload.deviceId),
  });
  if (!existing) {
    throw new Error(`Device ${payload.deviceId} vanished during upsert`);
  }
  if (existing.appId !== appId) {
    return { status: 'forbidden' };
  }
  return { status: 'ok', device: existing, inserted: false };
}

/**
 * Creates the session if it does not exist. The caller must already have
 * verified that the device belongs to the requesting app; an existing session
 * is only returned when it belongs to the same device.
 */
export async function createSession(values: {
  sessionId: string;
  deviceId: string;
  startedAt: Date;
}): Promise<SessionCreateResult> {
  const [created] = await db
    .insert(sessions)
    .values({ ...values, lastActivityAt: values.startedAt })
    .onConflictDoNothing({ target: sessions.sessionId })
    .returning();

  if (created) {
    // Sessions carry client time and may predate the server-stamped
    // first_seen (offline installs flush later), so pull first_seen back.
    await db
      .update(devices)
      .set({ firstSeen: values.startedAt })
      .where(
        and(
          eq(devices.deviceId, values.deviceId),
          gt(devices.firstSeen, values.startedAt)
        )
      );
    return { status: 'ok', session: created, inserted: true };
  }

  const existing = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, values.sessionId),
  });
  if (!existing) {
    throw new Error(`Session ${values.sessionId} vanished during insert`);
  }
  if (existing.deviceId !== values.deviceId) {
    return { status: 'foreign-device' };
  }
  return { status: 'ok', session: existing, inserted: false };
}
