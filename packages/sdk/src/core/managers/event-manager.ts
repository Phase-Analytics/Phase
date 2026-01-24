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
      logger.error(
        'Invalid event name. Use alphanumeric, _, -, ., /, or space'
      );
      return;
    }

    const paramsValidation = validateEventParams(params);
    if (!paramsValidation.success) {
      logger.error('Invalid event params. Use primitive values only.');
      return;
    }

    if (!this.rateLimiter.canTrack()) {
      return;
    }

    if (this.deduplicator.isDuplicate(name, params)) {
      logger.warn('Duplicate event detected. Ignoring.', { name });
      return;
    }

    const sessionId = this.getSessionId();
    if (!sessionId) {
      logger.error('Session not started. Cannot track event.');
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
      logger.error('Unhandled error in sendEvent. Event may be lost.');
    });
  }

  private async sendEvent(payload: CreateEventRequest): Promise<void> {
    if (this.isOnline) {
      const result = await this.httpClient.createEvent(payload);
      if (!result.success) {
        logger.error('Event tracking failed. Queuing for retry.', result.error);
        try {
          await this.offlineQueue.enqueue({ type: 'event', payload });
        } catch (error) {
          logger.error('Failed to queue event. Data may be lost.', error);
        }
      }
    } else {
      try {
        await this.offlineQueue.enqueue({ type: 'event', payload });
      } catch (error) {
        logger.error('Failed to queue event. Data may be lost.', error);
      }
    }
  }
}
