import type {
  BatchDeviceItem,
  BatchError,
  BatchEventItem,
  BatchItem,
  BatchPingItem,
  BatchResponse,
  BatchResultItem,
  BatchSessionItem,
} from '@phase/shared';
import { ErrorCode } from '@phase/shared';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db, devices, sessions } from '@/db';
import { getEventBuffer } from './event-buffer';
import { getLocationFromIP } from './geolocation';
import { normalizePath } from './path-normalizer';
import { getSessionActivityBuffer } from './session-activity-buffer';
import { sseManager } from './sse-manager';
import {
  SESSION_MAX_AGE,
  validateDeviceId,
  validateEventName,
  validateEventParams,
  validateSessionId,
  validateTimestamp,
} from './validators';

type SortedItems = {
  devices: BatchDeviceItem[];
  sessions: BatchSessionItem[];
  events: BatchEventItem[];
  pings: BatchPingItem[];
};

type ProcessResult = {
  results: BatchResultItem[];
  errors: BatchError[];
};

function sortBatchItems(items: BatchItem[]): SortedItems {
  const sorted: SortedItems = {
    devices: [],
    sessions: [],
    events: [],
    pings: [],
  };

  for (const item of items) {
    switch (item.type) {
      case 'device': {
        sorted.devices.push(item);
        break;
      }
      case 'session': {
        sorted.sessions.push(item);
        break;
      }
      case 'event': {
        sorted.events.push(item);
        break;
      }
      case 'ping': {
        sorted.pings.push(item);
        break;
      }
      default: {
        const _exhaustive: never = item;
        break;
      }
    }
  }

  sorted.devices.sort((a, b) => a.clientOrder - b.clientOrder);
  sorted.sessions.sort((a, b) => a.clientOrder - b.clientOrder);
  sorted.events.sort((a, b) => a.clientOrder - b.clientOrder);
  sorted.pings.sort((a, b) => a.clientOrder - b.clientOrder);

  return sorted;
}

function _normalizePlatform(
  platform: string | null | undefined
): 'ios' | 'android' | 'unknown' | null {
  if (!platform) {
    return null;
  }
  const lower = platform.toLowerCase();
  if (lower === 'ios' || lower === 'android') {
    return lower;
  }
  return 'unknown';
}

async function processDevices(
  items: BatchDeviceItem[],
  appId: string,
  ip: string
): Promise<ProcessResult> {
  const results: BatchResultItem[] = [];
  const errors: BatchError[] = [];

  let country: string | null = null;
  let city: string | null = null;
  let locationFetched = false;

  for (const item of items) {
    const { payload, clientOrder } = item;

    try {
      const deviceIdValidation = validateDeviceId(payload.deviceId);
      if (!deviceIdValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: deviceIdValidation.error.detail,
        });
        continue;
      }

      const existingDevice = await db.query.devices.findFirst({
        where: (table, { eq: eqFn }) => eqFn(table.deviceId, payload.deviceId),
      });

      let device: typeof devices.$inferSelect;

      if (existingDevice) {
        if (existingDevice.appId !== appId) {
          errors.push({
            clientOrder,
            code: ErrorCode.FORBIDDEN,
            detail: 'You do not have permission to update this device',
          });
          continue;
        }

        [device] = await db
          .update(devices)
          .set({
            osVersion: payload.osVersion ?? existingDevice.osVersion,
            platform: payload.platform ?? existingDevice.platform,
            locale: payload.locale ?? existingDevice.locale,
            model: payload.model ?? existingDevice.model,
          })
          .where(eq(devices.deviceId, payload.deviceId))
          .returning();
      } else {
        if (!locationFetched && ip && !payload.disableGeolocation) {
          const location = await getLocationFromIP(ip);
          country = location.countryCode;
          city = location.city;
          locationFetched = true;
        }

        [device] = await db
          .insert(devices)
          .values({
            deviceId: payload.deviceId,
            appId,
            osVersion: payload.osVersion ?? null,
            platform: payload.platform ?? null,
            locale: payload.locale ?? null,
            model: payload.model ?? null,
            country: country ?? null,
            city: city ?? null,
            properties: payload.properties ?? null,
          })
          .returning();
      }

      sseManager.pushDevice(appId, {
        deviceId: device.deviceId,
        country: device.country,
        platform: device.platform,
      });

      results.push({
        clientOrder,
        type: 'device',
        id: device.deviceId,
      });
    } catch (error) {
      console.error('[BatchProcessor.Device] Error:', error);
      errors.push({
        clientOrder,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to process device',
      });
    }
  }

  return { results, errors };
}

async function processSessions(
  items: BatchSessionItem[],
  appId: string,
  processedDeviceIds: Set<string>
): Promise<ProcessResult> {
  const results: BatchResultItem[] = [];
  const errors: BatchError[] = [];

  for (const item of items) {
    const { payload, clientOrder } = item;

    try {
      const sessionIdValidation = validateSessionId(payload.sessionId);
      if (!sessionIdValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: sessionIdValidation.error.detail,
        });
        continue;
      }

      const deviceIdValidation = validateDeviceId(payload.deviceId);
      if (!deviceIdValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: deviceIdValidation.error.detail,
        });
        continue;
      }

      const timestampValidation = validateTimestamp(
        payload.startedAt,
        'startedAt',
        'offline'
      );
      if (!timestampValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: timestampValidation.error.detail,
        });
        continue;
      }

      let deviceExists = processedDeviceIds.has(payload.deviceId);
      let device: typeof devices.$inferSelect | undefined;

      if (!deviceExists) {
        device = await db.query.devices.findFirst({
          where: (table, { eq: eqFn }) =>
            eqFn(table.deviceId, payload.deviceId),
        });

        if (device) {
          if (device.appId !== appId) {
            errors.push({
              clientOrder,
              code: ErrorCode.FORBIDDEN,
              detail: 'You do not have permission to access this device',
            });
            continue;
          }
          deviceExists = true;
        }
      }

      if (!deviceExists) {
        errors.push({
          clientOrder,
          code: ErrorCode.NOT_FOUND,
          detail: 'Device not found',
        });
        continue;
      }

      const existingSession = await db.query.sessions.findFirst({
        where: (table, { eq: eqFn }) =>
          eqFn(table.sessionId, payload.sessionId),
      });

      if (existingSession) {
        results.push({
          clientOrder,
          type: 'session',
          id: existingSession.sessionId,
        });
        continue;
      }

      const clientStartedAt = timestampValidation.data;

      const [newSession] = await db
        .insert(sessions)
        .values({
          sessionId: payload.sessionId,
          deviceId: payload.deviceId,
          startedAt: clientStartedAt,
          lastActivityAt: clientStartedAt,
        })
        .returning();

      if (!device) {
        device = await db.query.devices.findFirst({
          where: (table, { eq: eqFn }) =>
            eqFn(table.deviceId, payload.deviceId),
        });
      }

      if (device) {
        sseManager.pushSession(appId, {
          sessionId: newSession.sessionId,
          deviceId: newSession.deviceId,
          startedAt: newSession.startedAt.toISOString(),
          country: device.country,
          platform: device.platform,
        });
      }

      results.push({
        clientOrder,
        type: 'session',
        id: newSession.sessionId,
      });
    } catch (error) {
      console.error('[BatchProcessor.Session] Error:', error);
      errors.push({
        clientOrder,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to process session',
      });
    }
  }

  return { results, errors };
}

type ValidatedEvent = {
  clientOrder: number;
  eventId: string;
  sessionId: string;
  deviceId: string;
  appId: string;
  name: string;
  params: Record<string, string | number | boolean | null> | null;
  isScreen: boolean;
  timestamp: Date;
  country: string | null;
  platform: string | null;
};

async function processEvents(
  items: BatchEventItem[],
  appId: string,
  processedSessionIds: Set<string>
): Promise<ProcessResult> {
  const results: BatchResultItem[] = [];
  const errors: BatchError[] = [];

  const sessionCache = new Map<
    string,
    {
      session: typeof sessions.$inferSelect;
      device: typeof devices.$inferSelect;
    }
  >();

  const validatedEvents: ValidatedEvent[] = [];
  const sessionMaxTimestamps = new Map<string, Date>();

  for (const item of items) {
    const { payload, clientOrder } = item;

    try {
      const sessionIdValidation = validateSessionId(payload.sessionId);
      if (!sessionIdValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: sessionIdValidation.error.detail,
        });
        continue;
      }

      const eventNameValidation = validateEventName(payload.name);
      if (!eventNameValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: eventNameValidation.error.detail,
        });
        continue;
      }

      const timestampValidation = validateTimestamp(
        payload.timestamp,
        'timestamp',
        'offline'
      );
      if (!timestampValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: timestampValidation.error.detail,
        });
        continue;
      }

      const paramsValidation = validateEventParams(payload.params);
      if (!paramsValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: paramsValidation.error.detail,
        });
        continue;
      }

      let sessionData = sessionCache.get(payload.sessionId);

      if (!sessionData) {
        const result = await db
          .select({
            session: sessions,
            device: devices,
          })
          .from(sessions)
          .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
          .where(eq(sessions.sessionId, payload.sessionId))
          .limit(1);

        if (result.length === 0) {
          if (processedSessionIds.has(payload.sessionId)) {
            const freshResult = await db
              .select({
                session: sessions,
                device: devices,
              })
              .from(sessions)
              .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
              .where(eq(sessions.sessionId, payload.sessionId))
              .limit(1);

            if (freshResult.length > 0) {
              sessionData = freshResult[0];
              sessionCache.set(payload.sessionId, sessionData);
            }
          }

          if (!sessionData) {
            errors.push({
              clientOrder,
              code: ErrorCode.NOT_FOUND,
              detail: 'Session not found',
            });
            continue;
          }
        } else {
          sessionData = result[0];
          sessionCache.set(payload.sessionId, sessionData);
        }
      }

      if (sessionData.device.appId !== appId) {
        errors.push({
          clientOrder,
          code: ErrorCode.FORBIDDEN,
          detail: 'You do not have permission to access this session',
        });
        continue;
      }

      const clientTimestamp = timestampValidation.data;

      const sessionAge = Date.now() - sessionData.session.startedAt.getTime();
      if (sessionAge > SESSION_MAX_AGE.offline) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Session is too old, please start a new session',
        });
        continue;
      }

      if (clientTimestamp < sessionData.session.startedAt) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Event timestamp cannot be before session startedAt',
        });
        continue;
      }

      const eventId = ulid();
      const eventName = payload.isScreen
        ? normalizePath(payload.name)
        : payload.name;

      validatedEvents.push({
        clientOrder,
        eventId,
        sessionId: payload.sessionId,
        deviceId: sessionData.session.deviceId,
        appId: sessionData.device.appId,
        name: eventName,
        params: payload.params ?? null,
        isScreen: payload.isScreen,
        timestamp: clientTimestamp,
        country: sessionData.device.country,
        platform: sessionData.device.platform,
      });

      const currentMax = sessionMaxTimestamps.get(payload.sessionId);
      if (!currentMax || clientTimestamp > currentMax) {
        sessionMaxTimestamps.set(payload.sessionId, clientTimestamp);
      }
    } catch (error) {
      console.error('[BatchProcessor.Event] Error:', error);
      errors.push({
        clientOrder,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to process event',
      });
    }
  }

  if (validatedEvents.length > 0) {
    const bufferEvents = validatedEvents.map((e) => ({
      eventId: e.eventId,
      sessionId: e.sessionId,
      deviceId: e.deviceId,
      appId: e.appId,
      name: e.name,
      params: e.params,
      isScreen: e.isScreen,
      timestamp: e.timestamp.toISOString(),
    }));

    const pushResult = await getEventBuffer().pushMany(bufferEvents);

    const failedIndices = new Set(pushResult.failed.map((f) => f.index));

    for (let i = 0; i < validatedEvents.length; i++) {
      const event = validatedEvents[i];

      if (failedIndices.has(i)) {
        const failInfo = pushResult.failed.find((f) => f.index === i);
        errors.push({
          clientOrder: event.clientOrder,
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: failInfo?.error ?? 'Failed to buffer event',
        });
        continue;
      }

      sseManager.pushEvent(event.appId, {
        eventId: event.eventId,
        deviceId: event.deviceId,
        name: event.name,
        isScreen: event.isScreen,
        timestamp: event.timestamp.toISOString(),
        country: event.country,
        platform: event.platform,
      });

      results.push({
        clientOrder: event.clientOrder,
        type: 'event',
        id: event.eventId,
      });
    }

    const sessionBuffer = getSessionActivityBuffer();
    for (const [sessionId, maxTimestamp] of sessionMaxTimestamps) {
      const sessionData = sessionCache.get(sessionId);
      if (sessionData && maxTimestamp > sessionData.session.lastActivityAt) {
        sessionBuffer.push(sessionId, maxTimestamp, sessionData.device.appId);
      }
    }
  }

  return { results, errors };
}

async function processPings(
  items: BatchPingItem[],
  appId: string,
  processedSessionIds: Set<string>
): Promise<ProcessResult> {
  const results: BatchResultItem[] = [];
  const errors: BatchError[] = [];

  const sessionBuffer = getSessionActivityBuffer();
  const sessionCache = new Map<
    string,
    {
      session: typeof sessions.$inferSelect;
      device: typeof devices.$inferSelect;
    }
  >();

  for (const item of items) {
    const { payload, clientOrder } = item;

    try {
      const sessionIdValidation = validateSessionId(payload.sessionId);
      if (!sessionIdValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: sessionIdValidation.error.detail,
        });
        continue;
      }

      const timestampValidation = validateTimestamp(
        payload.timestamp,
        'timestamp',
        'offline'
      );
      if (!timestampValidation.success) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: timestampValidation.error.detail,
        });
        continue;
      }

      let sessionData = sessionCache.get(payload.sessionId);

      if (!sessionData) {
        const result = await db
          .select({
            session: sessions,
            device: devices,
          })
          .from(sessions)
          .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
          .where(eq(sessions.sessionId, payload.sessionId))
          .limit(1);

        if (result.length === 0) {
          if (processedSessionIds.has(payload.sessionId)) {
            const freshResult = await db
              .select({
                session: sessions,
                device: devices,
              })
              .from(sessions)
              .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
              .where(eq(sessions.sessionId, payload.sessionId))
              .limit(1);

            if (freshResult.length > 0) {
              sessionData = freshResult[0];
              sessionCache.set(payload.sessionId, sessionData);
            }
          }

          if (!sessionData) {
            errors.push({
              clientOrder,
              code: ErrorCode.NOT_FOUND,
              detail: 'Session not found',
            });
            continue;
          }
        } else {
          sessionData = result[0];
          sessionCache.set(payload.sessionId, sessionData);
        }
      }

      if (sessionData.device.appId !== appId) {
        errors.push({
          clientOrder,
          code: ErrorCode.FORBIDDEN,
          detail: 'You do not have permission to access this session',
        });
        continue;
      }

      const clientTimestamp = timestampValidation.data;

      const sessionAge = Date.now() - sessionData.session.startedAt.getTime();
      if (sessionAge > SESSION_MAX_AGE.offline) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Session is too old, please start a new session',
        });
        continue;
      }

      if (clientTimestamp < sessionData.session.startedAt) {
        errors.push({
          clientOrder,
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Ping timestamp cannot be before session startedAt',
        });
        continue;
      }

      sessionBuffer.push(
        payload.sessionId,
        clientTimestamp,
        sessionData.device.appId
      );

      results.push({
        clientOrder,
        type: 'ping',
        id: payload.sessionId,
      });
    } catch (error) {
      console.error('[BatchProcessor.Ping] Error:', error);
      errors.push({
        clientOrder,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to process ping',
      });
    }
  }

  return { results, errors };
}

export async function processBatch(
  items: BatchItem[],
  appId: string,
  ip: string
): Promise<BatchResponse> {
  const sorted = sortBatchItems(items);

  const allResults: BatchResultItem[] = [];
  const allErrors: BatchError[] = [];

  const processedDeviceIds = new Set<string>();
  const processedSessionIds = new Set<string>();

  if (sorted.devices.length > 0) {
    const deviceResult = await processDevices(sorted.devices, appId, ip);
    allResults.push(...deviceResult.results);
    allErrors.push(...deviceResult.errors);

    for (const result of deviceResult.results) {
      processedDeviceIds.add(result.id);
    }
  }

  if (sorted.sessions.length > 0) {
    const sessionResult = await processSessions(
      sorted.sessions,
      appId,
      processedDeviceIds
    );
    allResults.push(...sessionResult.results);
    allErrors.push(...sessionResult.errors);

    for (const result of sessionResult.results) {
      processedSessionIds.add(result.id);
    }
  }

  if (sorted.events.length > 0) {
    const eventResult = await processEvents(
      sorted.events,
      appId,
      processedSessionIds
    );
    allResults.push(...eventResult.results);
    allErrors.push(...eventResult.errors);
  }

  if (sorted.pings.length > 0) {
    const pingResult = await processPings(
      sorted.pings,
      appId,
      processedSessionIds
    );
    allResults.push(...pingResult.results);
    allErrors.push(...pingResult.errors);
  }

  return {
    processed: allResults.length,
    failed: allErrors.length,
    results: allResults,
    errors: allErrors,
  };
}
