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
import { db, devices } from '@/db';
import { type BufferedEvent, getEventBuffer } from './event-buffer';
import {
  getIngestSessions,
  type IngestSession,
  rememberSession,
} from './ingest-cache';
import { createSession, type DeviceRow, upsertDevice } from './ingest-store';
import { normalizePath } from './path-normalizer';
import { getSessionActivityBuffer } from './session-activity-buffer';
import { sseManager } from './sse-manager';
import {
  SESSION_MAX_AGE,
  SESSION_MAX_DURATION_MS,
  validateEventParams,
  validateTimestamp,
} from './validators';

type BatchContext = {
  appId: string;
  ip: string | null;
  isDebugData: boolean;
  devices: Map<string, DeviceRow>;
  sessions: Map<string, IngestSession>;
  // Ids whose creation failed for a transient reason in this batch; items
  // that depend on them are retryable instead of permanently "not found".
  transientDeviceIds: Set<string>;
  transientSessionIds: Set<string>;
  sessionLookupFailed: boolean;
  results: BatchResultItem[];
  errors: BatchError[];
};

type SessionCheck =
  | { ok: true; session: IngestSession }
  | { ok: false; error: Omit<BatchError, 'clientOrder'> };

function byClientOrder<T extends { clientOrder: number }>(items: T[]): T[] {
  return items.sort((a, b) => a.clientOrder - b.clientOrder);
}

function partitionItems(items: BatchItem[]) {
  const deviceItems: BatchDeviceItem[] = [];
  const sessionItems: BatchSessionItem[] = [];
  const eventItems: BatchEventItem[] = [];
  const pingItems: BatchPingItem[] = [];

  for (const item of items) {
    switch (item.type) {
      case 'device':
        deviceItems.push(item);
        break;
      case 'session':
        sessionItems.push(item);
        break;
      case 'event':
        eventItems.push(item);
        break;
      case 'ping':
        pingItems.push(item);
        break;
      default: {
        const _exhaustive: never = item;
        break;
      }
    }
  }

  return {
    deviceItems: byClientOrder(deviceItems),
    sessionItems: byClientOrder(sessionItems),
    eventItems: byClientOrder(eventItems),
    pingItems: byClientOrder(pingItems),
  };
}

function fail(
  ctx: BatchContext,
  clientOrder: number,
  code: ErrorCode,
  detail: string
): void {
  ctx.errors.push({ clientOrder, code, detail, retryable: false });
}

/** A server-side failure the SDK should resend the item for. */
function failTransient(
  ctx: BatchContext,
  clientOrder: number,
  detail: string
): void {
  ctx.errors.push({
    clientOrder,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    detail,
    retryable: true,
  });
}

function transientError(detail: string): Omit<BatchError, 'clientOrder'> {
  return { code: ErrorCode.INTERNAL_SERVER_ERROR, detail, retryable: true };
}

function validationError(detail: string): Omit<BatchError, 'clientOrder'> {
  return { code: ErrorCode.VALIDATION_ERROR, detail, retryable: false };
}

async function processDevices(
  ctx: BatchContext,
  items: BatchDeviceItem[]
): Promise<void> {
  for (const { payload, clientOrder } of items) {
    try {
      const result = await upsertDevice(payload, ctx.appId, ctx.ip);
      if (result.status === 'forbidden') {
        fail(
          ctx,
          clientOrder,
          ErrorCode.FORBIDDEN,
          'You do not have permission to update this device'
        );
        continue;
      }

      const { device, inserted } = result;
      ctx.devices.set(device.deviceId, device);
      if (inserted) {
        sseManager.pushDevice(ctx.appId, {
          deviceId: device.deviceId,
          country: device.country,
          platform: device.platform,
        });
      }
      ctx.results.push({ clientOrder, type: 'device', id: device.deviceId });
    } catch (error) {
      console.error('[BatchProcessor.Device] Error:', error);
      ctx.transientDeviceIds.add(payload.deviceId);
      failTransient(ctx, clientOrder, 'Failed to process device');
    }
  }
}

async function findDevice(
  ctx: BatchContext,
  deviceId: string
): Promise<DeviceRow | undefined> {
  const known = ctx.devices.get(deviceId);
  if (known) {
    return known;
  }
  const device = await db.query.devices.findFirst({
    where: eq(devices.deviceId, deviceId),
  });
  if (device?.appId === ctx.appId) {
    ctx.devices.set(deviceId, device);
  }
  return device;
}

async function processSessions(
  ctx: BatchContext,
  items: BatchSessionItem[]
): Promise<void> {
  for (const { payload, clientOrder } of items) {
    const startedAt = validateTimestamp(
      payload.startedAt,
      'startedAt',
      'offline'
    );
    if (!startedAt.success) {
      fail(ctx, clientOrder, startedAt.error.code, startedAt.error.detail);
      continue;
    }

    try {
      const device = await findDevice(ctx, payload.deviceId);
      if (!device) {
        if (ctx.transientDeviceIds.has(payload.deviceId)) {
          failTransient(ctx, clientOrder, 'Device could not be saved');
        } else {
          fail(ctx, clientOrder, ErrorCode.NOT_FOUND, 'Device not found');
        }
        continue;
      }
      if (device.appId !== ctx.appId) {
        fail(
          ctx,
          clientOrder,
          ErrorCode.FORBIDDEN,
          'You do not have permission to access this device'
        );
        continue;
      }

      const result = await createSession({
        sessionId: payload.sessionId,
        deviceId: payload.deviceId,
        startedAt: startedAt.data,
      });
      if (result.status === 'foreign-device') {
        fail(
          ctx,
          clientOrder,
          ErrorCode.VALIDATION_ERROR,
          'Session ID belongs to another device'
        );
        continue;
      }

      const { session, inserted } = result;
      const ingestSession: IngestSession = {
        sessionId: session.sessionId,
        deviceId: session.deviceId,
        appId: device.appId,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt,
        country: device.country,
        platform: device.platform,
      };
      ctx.sessions.set(session.sessionId, ingestSession);
      rememberSession(ingestSession);

      if (inserted) {
        sseManager.pushSession(ctx.appId, {
          sessionId: session.sessionId,
          deviceId: session.deviceId,
          startedAt: session.startedAt.toISOString(),
          country: device.country,
          platform: device.platform,
        });
      }
      ctx.results.push({
        clientOrder,
        type: 'session',
        id: session.sessionId,
      });
    } catch (error) {
      console.error('[BatchProcessor.Session] Error:', error);
      ctx.transientSessionIds.add(payload.sessionId);
      failTransient(ctx, clientOrder, 'Failed to process session');
    }
  }
}

async function resolveSessions(
  ctx: BatchContext,
  sessionIds: Iterable<string>
): Promise<void> {
  const missing = [...new Set(sessionIds)].filter(
    (sessionId) => !ctx.sessions.has(sessionId)
  );
  if (missing.length === 0) {
    return;
  }
  try {
    const found = await getIngestSessions(missing);
    for (const [sessionId, session] of found) {
      ctx.sessions.set(sessionId, session);
    }
  } catch (error) {
    console.error('[BatchProcessor] Session lookup failed:', error);
    ctx.sessionLookupFailed = true;
  }
}

function checkSession(
  ctx: BatchContext,
  sessionId: string,
  timestamp: Date,
  label: 'Event' | 'Ping'
): SessionCheck {
  const session = ctx.sessions.get(sessionId);
  if (!session) {
    if (ctx.sessionLookupFailed || ctx.transientSessionIds.has(sessionId)) {
      return { ok: false, error: transientError('Session lookup failed') };
    }
    return {
      ok: false,
      error: {
        code: ErrorCode.NOT_FOUND,
        detail: 'Session not found',
        retryable: false,
      },
    };
  }

  if (session.appId !== ctx.appId) {
    return {
      ok: false,
      error: {
        code: ErrorCode.FORBIDDEN,
        detail: 'You do not have permission to access this session',
        retryable: false,
      },
    };
  }

  const startedAtMs = session.startedAt.getTime();
  if (Date.now() - startedAtMs > SESSION_MAX_AGE.offline) {
    return {
      ok: false,
      error: validationError('Session is too old, please start a new session'),
    };
  }
  if (timestamp.getTime() - startedAtMs > SESSION_MAX_DURATION_MS) {
    return {
      ok: false,
      error: validationError(
        `${label} timestamp too far from session start (max 2h session duration)`
      ),
    };
  }
  if (timestamp.getTime() < startedAtMs) {
    return {
      ok: false,
      error: validationError(
        `${label} timestamp cannot be before session startedAt`
      ),
    };
  }

  return { ok: true, session };
}

function recordActivity(
  latest: Map<string, { session: IngestSession; timestamp: Date }>,
  session: IngestSession,
  timestamp: Date
): void {
  const current = latest.get(session.sessionId);
  if (!current || timestamp > current.timestamp) {
    latest.set(session.sessionId, { session, timestamp });
  }
}

function flushActivity(
  latest: Map<string, { session: IngestSession; timestamp: Date }>
): void {
  const activityBuffer = getSessionActivityBuffer();
  for (const { session, timestamp } of latest.values()) {
    const known =
      activityBuffer.getLastActivityAt(session.sessionId) ??
      session.lastActivityAt;
    if (timestamp > known) {
      activityBuffer.push(session.sessionId, timestamp);
    }
  }
}

type PendingEvent = {
  clientOrder: number;
  event: BufferedEvent;
  session: IngestSession;
  timestamp: Date;
};

async function processEvents(
  ctx: BatchContext,
  items: BatchEventItem[]
): Promise<void> {
  const pending: PendingEvent[] = [];

  for (const { payload, clientOrder } of items) {
    const timestamp = validateTimestamp(
      payload.timestamp,
      'timestamp',
      'offline'
    );
    if (!timestamp.success) {
      fail(ctx, clientOrder, timestamp.error.code, timestamp.error.detail);
      continue;
    }

    const params = validateEventParams(payload.params);
    if (!params.success) {
      fail(ctx, clientOrder, params.error.code, params.error.detail);
      continue;
    }

    const check = checkSession(ctx, payload.sessionId, timestamp.data, 'Event');
    if (!check.ok) {
      ctx.errors.push({ clientOrder, ...check.error });
      continue;
    }

    const { session } = check;
    pending.push({
      clientOrder,
      session,
      timestamp: timestamp.data,
      event: {
        eventId: payload.eventId?.toUpperCase() ?? ulid(),
        sessionId: session.sessionId,
        deviceId: session.deviceId,
        appId: session.appId,
        name: payload.isScreen ? normalizePath(payload.name) : payload.name,
        params: params.data,
        isScreen: payload.isScreen,
        isDebug: ctx.isDebugData,
        timestamp: timestamp.data.toISOString(),
      },
    });
  }

  if (pending.length === 0) {
    return;
  }

  let rejected: Map<number, string>;
  try {
    const pushResult = await getEventBuffer().pushMany(
      pending.map(({ event }) => event)
    );
    rejected = new Map(pushResult.failed.map((f) => [f.index, f.error]));
  } catch (error) {
    console.error('[BatchProcessor.Event] Buffer push failed:', error);
    for (const { clientOrder } of pending) {
      failTransient(ctx, clientOrder, 'Failed to buffer event');
    }
    return;
  }

  const latestActivity = new Map<
    string,
    { session: IngestSession; timestamp: Date }
  >();

  for (const [
    index,
    { clientOrder, event, session, timestamp },
  ] of pending.entries()) {
    const rejection = rejected.get(index);
    if (rejection) {
      fail(ctx, clientOrder, ErrorCode.VALIDATION_ERROR, rejection);
      continue;
    }

    sseManager.pushEvent(event.appId, {
      eventId: event.eventId,
      deviceId: event.deviceId,
      name: event.name,
      isScreen: event.isScreen,
      isDebug: event.isDebug,
      timestamp: event.timestamp,
      country: session.country,
      platform: session.platform,
    });
    ctx.results.push({ clientOrder, type: 'event', id: event.eventId });
    recordActivity(latestActivity, session, timestamp);
  }

  flushActivity(latestActivity);
}

function processPings(ctx: BatchContext, items: BatchPingItem[]): void {
  const latestActivity = new Map<
    string,
    { session: IngestSession; timestamp: Date }
  >();

  for (const { payload, clientOrder } of items) {
    const timestamp = validateTimestamp(
      payload.timestamp,
      'timestamp',
      'offline'
    );
    if (!timestamp.success) {
      fail(ctx, clientOrder, timestamp.error.code, timestamp.error.detail);
      continue;
    }

    const check = checkSession(ctx, payload.sessionId, timestamp.data, 'Ping');
    if (!check.ok) {
      ctx.errors.push({ clientOrder, ...check.error });
      continue;
    }

    recordActivity(latestActivity, check.session, timestamp.data);
    ctx.results.push({ clientOrder, type: 'ping', id: payload.sessionId });
  }

  flushActivity(latestActivity);
}

export async function processBatch(
  items: BatchItem[],
  appId: string,
  ip: string | null,
  isDebugData: boolean
): Promise<BatchResponse> {
  const { deviceItems, sessionItems, eventItems, pingItems } =
    partitionItems(items);

  const ctx: BatchContext = {
    appId,
    ip,
    isDebugData,
    devices: new Map(),
    sessions: new Map(),
    transientDeviceIds: new Set(),
    transientSessionIds: new Set(),
    sessionLookupFailed: false,
    results: [],
    errors: [],
  };

  await processDevices(ctx, deviceItems);
  await processSessions(ctx, sessionItems);
  await resolveSessions(ctx, [
    ...eventItems.map((item) => item.payload.sessionId),
    ...pingItems.map((item) => item.payload.sessionId),
  ]);
  await processEvents(ctx, eventItems);
  processPings(ctx, pingItems);

  return {
    processed: ctx.results.length,
    failed: ctx.errors.length,
    results: ctx.results,
    errors: ctx.errors,
  };
}
