import type { OfflineQueue } from '../queue/offline-queue';
import { generateSessionId } from '../utils/id-generator';
import { logger } from '../utils/logger';

const INITIAL_HEARTBEAT_INTERVAL_MS = 5000;
const EARLY_HEARTBEAT_INTERVAL_MS = 10_000;
const STANDARD_HEARTBEAT_INTERVAL_MS = 15_000;
const EXTENDED_HEARTBEAT_INTERVAL_MS = 20_000;
const LONG_HEARTBEAT_INTERVAL_MS = 30_000;
const EARLY_HEARTBEAT_AT_MS = 15_000;
const STANDARD_HEARTBEAT_AT_MS = 65_000;
const EXTENDED_HEARTBEAT_AT_MS = 3 * 60 * 1000;
const LONG_HEARTBEAT_AT_MS = 5 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000;

type Instant = { wall: number; mono: number };

const perf = (globalThis as { performance?: { now?: () => number } })
  .performance;

function monotonicNow(): number {
  return typeof perf?.now === 'function' ? perf.now() : Date.now();
}

function now(): Instant {
  return { wall: Date.now(), mono: monotonicNow() };
}

/**
 * Elapsed time since `since`. The monotonic clock is immune to wall-clock
 * changes, but on iOS/Android it stops while the device sleeps, so take the
 * larger of the two: a suspended app must still rotate its session.
 */
function elapsedSince(since: Instant): number {
  const current = now();
  return Math.max(current.wall - since.wall, current.mono - since.mono);
}

export class SessionManager {
  private sessionId: string | null = null;
  private startedAt: Instant | null = null;
  private pausedAt: Instant | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly queue: OfflineQueue;
  private readonly getDeviceId: () => string | null;

  constructor(queue: OfflineQueue, getDeviceId: () => string | null) {
    this.queue = queue;
    this.getDeviceId = getDeviceId;
  }

  /**
   * Starts a session unless one is active. `startedAtMs` lets events captured
   * before identify() fall inside the session (server rejects events older
   * than their session).
   */
  start(startedAtMs?: number): string | null {
    if (this.sessionId) {
      return this.sessionId;
    }

    const deviceId = this.getDeviceId();
    if (!deviceId) {
      logger.error('Device ID not set. Cannot start session.');
      return null;
    }

    const current = now();
    const offset =
      startedAtMs !== undefined && startedAtMs < current.wall
        ? current.wall - startedAtMs
        : 0;

    this.sessionId = generateSessionId();
    this.startedAt = {
      wall: current.wall - offset,
      mono: current.mono - offset,
    };
    this.pausedAt = null;

    this.queue.enqueue({
      type: 'session',
      payload: {
        sessionId: this.sessionId,
        deviceId,
        startedAt: new Date(this.startedAt.wall).toISOString(),
      },
    });

    this.startHeartbeat();
    return this.sessionId;
  }

  /** Ends the current session without starting a new one (used by reset()). */
  end(): void {
    this.stopHeartbeat();
    this.sessionId = null;
    this.startedAt = null;
    this.pausedAt = null;
  }

  pause(): void {
    if (!this.pausedAt) {
      this.pausedAt = now();
    }
    this.stopHeartbeat();
  }

  resume(): void {
    if (!this.sessionId) {
      return;
    }

    const inactiveFor = this.pausedAt ? elapsedSince(this.pausedAt) : 0;
    this.pausedAt = null;

    if (inactiveFor > INACTIVITY_TIMEOUT_MS) {
      logger.info('Session inactive for too long, starting new session', {
        inactiveSeconds: Math.round(inactiveFor / 1000),
      });
      this.rotate();
      return;
    }

    if (this.getSessionAge() >= MAX_SESSION_AGE_MS) {
      logger.info('Session reached maximum age, starting new session');
      this.rotate();
      return;
    }

    this.startHeartbeat();
  }

  /**
   * Session for new activity. Rotates first when the session hit the server's
   * 2h duration limit, since activity after it would be rejected.
   */
  getSessionId(): string | null {
    if (
      this.sessionId &&
      !this.pausedAt &&
      this.getSessionAge() >= MAX_SESSION_AGE_MS
    ) {
      logger.info('Session reached maximum age, starting new session');
      this.rotate();
    }
    return this.sessionId;
  }

  /** Activity already proves liveness, so push the next heartbeat back. */
  markActivity(): void {
    if (this.sessionId && !this.pausedAt) {
      this.startHeartbeat();
    }
  }

  private rotate(): void {
    this.end();
    this.start();
  }

  private getSessionAge(): number {
    return this.startedAt ? elapsedSince(this.startedAt) : 0;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setTimeout(() => {
      this.heartbeatTimer = null;
      this.beat();
    }, this.getHeartbeatIntervalMs());
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private beat(): void {
    if (!this.sessionId || this.pausedAt) {
      return;
    }

    if (this.getSessionAge() >= MAX_SESSION_AGE_MS) {
      logger.info('Session reached maximum age, starting new session');
      this.rotate();
      return;
    }

    this.queue.enqueue({
      type: 'ping',
      payload: {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      },
    });
    this.startHeartbeat();
  }

  private getHeartbeatIntervalMs(): number {
    const sessionAge = this.getSessionAge();

    if (sessionAge >= LONG_HEARTBEAT_AT_MS) {
      return LONG_HEARTBEAT_INTERVAL_MS;
    }
    if (sessionAge >= EXTENDED_HEARTBEAT_AT_MS) {
      return EXTENDED_HEARTBEAT_INTERVAL_MS;
    }
    if (sessionAge >= STANDARD_HEARTBEAT_AT_MS) {
      return STANDARD_HEARTBEAT_INTERVAL_MS;
    }
    if (sessionAge >= EARLY_HEARTBEAT_AT_MS) {
      return EARLY_HEARTBEAT_INTERVAL_MS;
    }
    return INITIAL_HEARTBEAT_INTERVAL_MS;
  }
}
