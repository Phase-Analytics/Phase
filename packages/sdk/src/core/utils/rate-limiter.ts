import type { EventParams } from '../types';
import { logger } from './logger';

const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_EVENTS_PER_SECOND = 15;
const DEDUP_WINDOW_MS = 50;

export class RateLimiter {
  private eventTimestamps: number[] = [];

  canTrack(): boolean {
    const now = Date.now();
    this.eventTimestamps = this.eventTimestamps.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );

    if (this.eventTimestamps.length >= MAX_EVENTS_PER_SECOND) {
      logger.info(
        `Rate limit exceeded: ${MAX_EVENTS_PER_SECOND} events/second. Dropping event.`
      );
      return false;
    }

    this.eventTimestamps.push(now);
    return true;
  }

  reset(): void {
    this.eventTimestamps = [];
  }
}

type EventKey = string;

export class EventDeduplicator {
  private readonly recentEvents = new Map<EventKey, number>();

  isDuplicate(name: string, params?: EventParams): boolean {
    const key = this.createKey(name, params);
    const lastTime = this.recentEvents.get(key);
    const now = Date.now();

    if (lastTime && now - lastTime < DEDUP_WINDOW_MS) {
      logger.debug(
        `Duplicate event detected within ${DEDUP_WINDOW_MS}ms window: ${name}`
      );
      return true;
    }

    this.recentEvents.set(key, now);
    this.cleanup(now);
    return false;
  }

  private createKey(name: string, params?: EventParams): EventKey {
    if (!params) {
      return name;
    }
    try {
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
          acc[key] = params[key];
          return acc;
        }, {} as EventParams);
      return `${name}:${JSON.stringify(sortedParams)}`;
    } catch {
      return name;
    }
  }

  private cleanup(now: number): void {
    for (const [key, timestamp] of this.recentEvents.entries()) {
      if (now - timestamp > DEDUP_WINDOW_MS) {
        this.recentEvents.delete(key);
      }
    }
  }

  reset(): void {
    this.recentEvents.clear();
  }
}
