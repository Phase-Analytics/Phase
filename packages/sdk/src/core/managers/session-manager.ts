import type { HttpClient } from '../client/http-client';
import type { OfflineQueue } from '../queue/offline-queue';
import type { CreateSessionRequest, PingSessionRequest } from '../types';
import { generateSessionId } from '../utils/id-generator';
import { logger } from '../utils/logger';
import { validateSessionId } from '../utils/validator';

const PING_INTERVAL_MS = 5000;

export class SessionManager {
  private sessionId: string | null = null;
  private startPromise: Promise<string> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;
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
      logger.error('Generated session ID invalid, retrying');
      this.sessionId = generateSessionId();
      const retryValidation = validateSessionId(this.sessionId);
      if (!retryValidation.success) {
        logger.error('Failed to generate valid session ID, using fallback');
      }
    }

    const payload: CreateSessionRequest = {
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      startedAt: new Date().toISOString(),
    };

    if (isOnline) {
      const result = await this.httpClient.createSession(payload);
      if (!result.success) {
        logger.error('Failed to create session, queueing');
        await this.offlineQueue.enqueue({ type: 'session', payload });
      }
    } else {
      await this.offlineQueue.enqueue({ type: 'session', payload });
    }

    this.startPingInterval();

    return this.sessionId;
  }

  pause(): void {
    this.stopPingInterval();
  }

  resume(): void {
    if (this.sessionId) {
      this.startPingInterval();
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  updateNetworkState(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  private startPingInterval(): void {
    this.stopPingInterval();

    this.pingInterval = setInterval(() => {
      this.sendPing().catch(() => {
        logger.error('Unhandled error in sendPing');
      });
    }, PING_INTERVAL_MS);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async sendPing(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    const payload: PingSessionRequest = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    };

    if (this.isOnline) {
      const result = await this.httpClient.pingSession(payload);
      if (!result.success) {
        logger.error('Failed to ping session, queueing');
        await this.offlineQueue.enqueue({ type: 'ping', payload });
      }
    } else {
      await this.offlineQueue.enqueue({ type: 'ping', payload });
    }
  }
}
