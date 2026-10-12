import {
  FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS,
  type FunnelCustomStep,
  type FunnelResult,
  type FunnelStepKind,
  funnelStepLabel,
} from '@phase/shared';
import { SESSION_MIN_DURATION_SECONDS } from '@/lib/validators';
import {
  loadEventTimes,
  loadFirstEventTimes,
  loadFirstSeenMap,
  loadSessions,
  type SessionRecord,
} from './loaders';
import { buildStepResults, type FunnelPeriod, toFunnelResult } from './results';

const SESSION_30S = 30;
const SESSION_10M = 10 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;
// first_seen is stamped by the server when the device registers, while
// session and event times come from the client, which usually starts the
// session a moment earlier. Without slack the first session never counts as
// happening "after" first seen.
const FIRST_SEEN_SKEW_MS = 5 * 60 * 1000;

function firstSeenAt(
  firstSeenMap: Map<string, number>,
  deviceId: string
): number | undefined {
  const ts = firstSeenMap.get(deviceId);
  return ts === undefined ? undefined : ts - FIRST_SEEN_SKEW_MS;
}

function startOfUtcDay(ms: number): number {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function firstSessionAfter(
  sessions: SessionRecord[] | undefined,
  afterMs: number,
  windowEndMs: number,
  minDuration: number
): number | null {
  if (!sessions) {
    return null;
  }
  for (const session of sessions) {
    if (
      session.startedAt > afterMs &&
      session.startedAt <= windowEndMs &&
      session.durationSeconds >= minDuration
    ) {
      return session.startedAt;
    }
  }
  return null;
}

function firstTimestampAfter(
  times: number[] | undefined,
  afterMs: number,
  windowEndMs: number
): number | null {
  if (!times) {
    return null;
  }
  for (const time of times) {
    if (time > afterMs && time <= windowEndMs) {
      return time;
    }
  }
  return null;
}

function engagedThresholdAt(
  sessions: SessionRecord[] | undefined,
  afterMs: number,
  windowEndMs: number,
  thresholdSeconds: number
): number | null {
  if (!sessions) {
    return null;
  }
  let total = 0;
  for (const session of sessions) {
    if (session.startedAt <= afterMs || session.startedAt > windowEndMs) {
      continue;
    }
    total += session.durationSeconds;
    if (total >= thresholdSeconds) {
      return session.startedAt + session.durationSeconds * 1000;
    }
  }
  return null;
}

function returnOnDay(
  sessions: SessionRecord[] | undefined,
  previousTs: number,
  dayOffset: number,
  windowEndMs: number
): number | null {
  if (!sessions) {
    return null;
  }
  const dayStart = startOfUtcDay(previousTs) + dayOffset * DAY_MS;
  const dayEnd = dayStart + DAY_MS;
  for (const session of sessions) {
    if (
      session.startedAt >= dayStart &&
      session.startedAt < dayEnd &&
      session.startedAt > previousTs &&
      session.startedAt <= windowEndMs
    ) {
      return session.startedAt;
    }
  }
  return null;
}

function resolveStepTimestamp(options: {
  kind: FunnelStepKind;
  eventName?: string;
  deviceId: string;
  previousTs: number | null;
  windowEndMs: number;
  firstSeenMap: Map<string, number>;
  sessionMap: Map<string, SessionRecord[]>;
  eventTimeMaps: Map<string, Map<string, number[]>>;
}): number | null {
  const {
    kind,
    eventName,
    deviceId,
    previousTs,
    windowEndMs,
    firstSeenMap,
    sessionMap,
    eventTimeMaps,
  } = options;

  if (previousTs === null) {
    if (kind === 'first_seen') {
      return firstSeenAt(firstSeenMap, deviceId) ?? null;
    }
    if (kind === 'session') {
      return firstSessionAfter(
        sessionMap.get(deviceId),
        Number.NEGATIVE_INFINITY,
        windowEndMs,
        SESSION_MIN_DURATION_SECONDS
      );
    }
    if (kind === 'session_30s') {
      return firstSessionAfter(
        sessionMap.get(deviceId),
        Number.NEGATIVE_INFINITY,
        windowEndMs,
        SESSION_30S
      );
    }
    if (kind === 'session_10m') {
      return firstSessionAfter(
        sessionMap.get(deviceId),
        Number.NEGATIVE_INFINITY,
        windowEndMs,
        SESSION_10M
      );
    }
    if (kind === 'engaged_10m') {
      return engagedThresholdAt(
        sessionMap.get(deviceId),
        Number.NEGATIVE_INFINITY,
        windowEndMs,
        FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS
      );
    }
    if (kind === 'return_d1' || kind === 'return_d3') {
      return null;
    }
    return eventTimeMaps.get(eventName ?? '')?.get(deviceId)?.[0] ?? null;
  }

  if (kind === 'first_seen') {
    const ts = firstSeenAt(firstSeenMap, deviceId);
    return ts !== undefined && ts > previousTs && ts <= windowEndMs ? ts : null;
  }
  if (kind === 'session') {
    return firstSessionAfter(
      sessionMap.get(deviceId),
      previousTs,
      windowEndMs,
      SESSION_MIN_DURATION_SECONDS
    );
  }
  if (kind === 'session_30s') {
    return firstSessionAfter(
      sessionMap.get(deviceId),
      previousTs,
      windowEndMs,
      SESSION_30S
    );
  }
  if (kind === 'session_10m') {
    return firstSessionAfter(
      sessionMap.get(deviceId),
      previousTs,
      windowEndMs,
      SESSION_10M
    );
  }
  if (kind === 'engaged_10m') {
    return engagedThresholdAt(
      sessionMap.get(deviceId),
      previousTs,
      windowEndMs,
      FUNNEL_ENGAGED_TOTAL_SESSION_SECONDS
    );
  }
  if (kind === 'return_d1') {
    return returnOnDay(sessionMap.get(deviceId), previousTs, 1, windowEndMs);
  }
  if (kind === 'return_d3') {
    return returnOnDay(sessionMap.get(deviceId), previousTs, 3, windowEndMs);
  }
  return firstTimestampAfter(
    eventTimeMaps.get(eventName ?? '')?.get(deviceId),
    previousTs,
    windowEndMs
  );
}

function needsSessions(steps: FunnelCustomStep[]): boolean {
  return steps.some((step) =>
    [
      'session',
      'session_30s',
      'session_10m',
      'engaged_10m',
      'return_d1',
      'return_d3',
    ].includes(step.kind)
  );
}

function stepEventName(step: FunnelCustomStep): string | undefined {
  return step.kind === 'event' ? step.name?.trim() || undefined : undefined;
}

/**
 * Loads each custom event once. An event used only as the first step needs
 * just its earliest occurrence per device inside the period, which QuestDB
 * aggregates; any later use needs every occurrence up to the window end.
 */
async function loadEventTimeMaps(
  appId: string,
  steps: FunnelCustomStep[],
  period: FunnelPeriod,
  rangeEnd: Date
): Promise<Map<string, Map<string, number[]>>> {
  const laterNames = new Set(steps.slice(1).map(stepEventName));
  const names = [...new Set(steps.map(stepEventName))].filter(
    (name): name is string => Boolean(name)
  );

  const maps = await Promise.all(
    names.map((name) =>
      laterNames.has(name)
        ? loadEventTimes(appId, name, period.start, rangeEnd)
        : loadFirstEventTimes(appId, name, period.start, period.end)
    )
  );
  return new Map(names.map((name, index) => [name, maps[index]]));
}

export async function runCustomFunnel(
  appId: string,
  steps: FunnelCustomStep[],
  period: FunnelPeriod,
  windowHours: number
): Promise<FunnelResult> {
  const first = steps[0];
  if (!first || steps.length < 2) {
    throw new Error('Custom funnel requires at least 2 steps');
  }
  if (first.kind === 'event' && !stepEventName(first)) {
    throw new Error('First step event name is required');
  }

  const windowMs = windowHours * 60 * 60 * 1000;
  const startMs = period.start.getTime();
  const endMs = period.end.getTime();
  const rangeEnd = new Date(endMs + windowMs);

  // Every map covers [period.start, rangeEnd], a superset of the period, so
  // the first-step cohort is derived from them without a second load.
  const [firstSeenMap, sessionMap, eventTimeMaps] = await Promise.all([
    steps.some((step) => step.kind === 'first_seen')
      ? loadFirstSeenMap(appId, period)
      : Promise.resolve(new Map<string, number>()),
    needsSessions(steps)
      ? loadSessions(appId, period.start, rangeEnd)
      : Promise.resolve(new Map<string, SessionRecord[]>()),
    loadEventTimeMaps(appId, steps, period, rangeEnd),
  ]);

  const stepContext = { firstSeenMap, sessionMap, eventTimeMaps };
  let candidates: Iterable<string>;
  if (first.kind === 'first_seen') {
    candidates = firstSeenMap.keys();
  } else if (first.kind === 'event') {
    candidates = eventTimeMaps.get(stepEventName(first) ?? '')?.keys() ?? [];
  } else {
    candidates = sessionMap.keys();
  }

  const reached = steps.map(() => 0);

  for (const deviceId of candidates) {
    let previousTs: number | null = null;

    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      const nextTs = resolveStepTimestamp({
        kind: step.kind,
        eventName: stepEventName(step),
        deviceId,
        previousTs,
        windowEndMs: previousTs === null ? endMs : previousTs + windowMs,
        ...stepContext,
      });

      if (nextTs === null) {
        break;
      }
      if (index === 0 && (nextTs < startMs || nextTs > endMs)) {
        break;
      }

      reached[index] = (reached[index] ?? 0) + 1;
      previousTs = nextTs;
    }
  }

  const stepResults = buildStepResults(
    steps.map((step, index) => ({
      key: `step_${index}`,
      label: funnelStepLabel(step),
    })),
    reached
  );

  return toFunnelResult(stepResults, period);
}
