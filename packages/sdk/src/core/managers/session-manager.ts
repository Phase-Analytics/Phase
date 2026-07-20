import type { HttpClient } from '../client/http-client';
import type { OfflineQueue } from '../queue/offline-queue';
import { getItem, setItem } from '../storage/storage';
import type { CreateSessionRequest, PingSessionRequest } from '../types';
import { STORAGE_KEYS } from '../types';
import { generateSessionId } from '../utils/id-generator';
import { logger } from '../utils/logger';
import { validateSessionId } from '../utils/validator';

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

export class SessionManager {
  private sessionId: string | null = null;
  private startPromise: Promise<string> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatVersion = 0;
  private isOnline = true;
  private pausedAt: number | null = null;
  private startedAtMs: number | null = null;
  private readonly httpClient: HttpClient;
  private readonly offlineQueue: OfflineQueue;
  private readonly deviceId: string;

  constructor(
    httpClient: HttpClient,
    offlineQueue: OfflineQueue,
    deviceId: string
  ) {
    this.httpClient = httpClient;
    this.offlineQueue = offlineQueue;
    this.deviceId = deviceId;
  }

  async start(isOnline: boolean): Promise<string> {
    if (this.startPromise) {
      return this.startPromise;
    }
    if (this.sessionId) {
      return this.sessionId;
    }

    this.startPromise = this.doStart(isOnline);

    try {
      return await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  private async doStart(isOnline: boolean): Promise<string> {
    this.stopPingInterval();

    this.isOnline = isOnline;
    this.sessionId = generateSessionId();

    const validation = validateSessionId(this.sessionId);
    if (!validation.success) {
      logger.error('Generated session ID invalid. Retrying.');
      this.sessionId = generateSessionId();
      const retryValidation = validateSessionId(this.sessionId);
      if (!retryValidation.success) {
        logger.error('Failed to generate valid session ID. Using fallback.');
      }
    }

    const startedAt = new Date().toISOString();
    this.startedAtMs = Date.now();
    const payload: CreateSessionRequest = {
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      startedAt,
    };

    const persistResult = await setItem(
      STORAGE_KEYS.SESSION_STARTED_AT,
      startedAt
    );
    if (!persistResult.success) {
      logger.warn(
        'Failed to persist session start time. Session age checks may not work correctly.'
      );
    }

    if (isOnline) {
      const result = await this.httpClient.createSession(payload);
      if (!result.success) {
        logger.error(
          'Session creation failed. Queuing for retry.',
          result.error
        );
        await this.offlineQueue.enqueue({ type: 'session', payload });
      }
    } else {
      await this.offlineQueue.enqueue({ type: 'session', payload });
    }

    this.startPingInterval();

    return this.sessionId;
  }

  pause(): void {
    this.pausedAt = Date.now();
    this.stopPingInterval();
  }

  async resume(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    const sessionStartedResult = await getItem<string>(
      STORAGE_KEYS.SESSION_STARTED_AT
    );
    if (sessionStartedResult.success && sessionStartedResult.data) {
      const sessionStartTime = new Date(sessionStartedResult.data).getTime();
      const sessionAge = Date.now() - sessionStartTime;

      if (sessionAge > MAX_SESSION_AGE_MS) {
        logger.info('Session too old, starting new session', {
          sessionAge: Math.round(sessionAge / 1000),
          maxAge: Math.round(MAX_SESSION_AGE_MS / 1000),
        });

        this.sessionId = null;
        this.startedAtMs = null;
        this.pausedAt = null;

        await this.start(this.isOnline);
        return;
      }
    }

    if (this.pausedAt) {
      const inactiveDuration = Date.now() - this.pausedAt;

      if (inactiveDuration > INACTIVITY_TIMEOUT_MS) {
        logger.info('Session inactive for too long, starting new session', {
          inactiveDuration: Math.round(inactiveDuration / 1000),
          threshold: Math.round(INACTIVITY_TIMEOUT_MS / 1000),
        });

        this.sessionId = null;
        this.pausedAt = null;

        await this.start(this.isOnline);
        return;
      }

      this.pausedAt = null;
    }

    this.startPingInterval();
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  updateNetworkState(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  markActivity(): void {
    if (this.pausedAt !== null) {
      return;
    }

    this.startPingInterval();
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    const heartbeatVersion = this.heartbeatVersion;

    this.heartbeatTimer = setTimeout(() => {
      this.heartbeatTimer = null;
      this.sendPing()
        .catch(() => {
          logger.error('Unhandled error in sendPing. Session may timeout.');
        })
        .finally(() => {
          if (heartbeatVersion === this.heartbeatVersion && this.sessionId) {
            this.startPingInterval();
          }
        });
    }, this.getHeartbeatIntervalMs());
  }

  private stopPingInterval(): void {
    this.heartbeatVersion += 1;
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private getHeartbeatIntervalMs(): number {
    const sessionAge =
      this.startedAtMs === null ? 0 : Date.now() - this.startedAtMs;

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

  private async sendPing(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    if (
      this.startedAtMs !== null &&
      Date.now() - this.startedAtMs >= MAX_SESSION_AGE_MS
    ) {
      logger.info('Session reached maximum age, starting new session');
      this.sessionId = null;
      this.startedAtMs = null;
      await this.start(this.isOnline);
      return;
    }

    const payload: PingSessionRequest = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    };

    if (this.isOnline) {
      const result = await this.httpClient.pingSession(payload);
      if (!result.success) {
        logger.error('Session ping failed. Queuing for retry.', result.error);
        await this.offlineQueue.enqueue({ type: 'ping', payload });
        return;
      }

      this.markActivity();
    } else {
      await this.offlineQueue.enqueue({ type: 'ping', payload });
    }
  }
}
