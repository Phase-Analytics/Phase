import type { HttpClient } from '../client/http-client';
import type { OfflineQueue } from '../queue/offline-queue';
import type { CreateEventRequest, EventParams } from '../types';
import { logger } from '../utils/logger';
import { EventDeduplicator, RateLimiter } from '../utils/rate-limiter';
import { validateEventName, validateEventParams } from '../utils/validator';

export class EventManager {
  private isOnline = true;
  private readonly httpClient: HttpClient;
  private readonly offlineQueue: OfflineQueue;
  private readonly getSessionId: () => string | null;
  private readonly rateLimiter = new RateLimiter();
  private readonly deduplicator = new EventDeduplicator();

  constructor(
    httpClient: HttpClient,
    offlineQueue: OfflineQueue,
    getSessionId: () => string | null
  ) {
    this.httpClient = httpClient;
    this.offlineQueue = offlineQueue;
    this.getSessionId = getSessionId;
  }

  updateNetworkState(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  track(name: string, params?: EventParams, isScreen = false): void {
    const nameValidation = validateEventName(name);
    if (!nameValidation.success) {
      logger.error('Invalid event name');
      return;
    }

    const paramsValidation = validateEventParams(params);
    if (!paramsValidation.success) {
      logger.error('Invalid event params');
      return;
    }

    if (!this.rateLimiter.canTrack()) {
      return;
    }

    if (this.deduplicator.isDuplicate(name, params)) {
      logger.debug('Duplicate event ignored', { name });
      return;
    }

    const sessionId = this.getSessionId();
    if (!sessionId) {
      logger.error('Session not started, cannot track event');
      return;
    }

    const payload: CreateEventRequest = {
      sessionId,
      name,
      params,
      isScreen,
      timestamp: new Date().toISOString(),
    };

    this.sendEvent(payload).catch(() => {
      logger.error('Unhandled error in sendEvent');
    });
  }

  private async sendEvent(payload: CreateEventRequest): Promise<void> {
    if (this.isOnline) {
      const result = await this.httpClient.createEvent(payload);
      if (!result.success) {
        logger.error('Failed to track event, queueing');
        try {
          await this.offlineQueue.enqueue({ type: 'event', payload });
        } catch {
          logger.error('Failed to queue event');
        }
      }
    } else {
      try {
        await this.offlineQueue.enqueue({ type: 'event', payload });
      } catch {
        logger.error('Failed to queue event');
      }
    }
  }
}
