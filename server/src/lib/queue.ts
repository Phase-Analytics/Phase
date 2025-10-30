import Redis from 'ioredis';
import { z } from 'zod';
import { db, events } from '@/db';

const analyticsEventDataSchema = z.object({
  eventId: z.string(),
  sessionId: z.string(),
  name: z.string(),
  params: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .optional(),
  timestamp: z
    .number()
    .refine(
      (val) => val > 1e12,
      'timestamp must be in milliseconds since Unix epoch (not seconds)'
    ),
});

export type AnalyticsEventData = z.infer<typeof analyticsEventDataSchema>;

const REDIS_QUEUE_KEY = 'analytics:events:queue';
const BATCH_SIZE = 50;
const BATCH_INTERVAL_MS = 5000;

class SimpleAnalyticsQueue {
  private readonly redis: Redis;
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isClosing = false;
  private isClosed = false;

  constructor() {
    const url = process.env.UPSTASH_REDIS_URL;
    if (!url) {
      throw new Error('UPSTASH_REDIS_URL must be set');
    }

    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: false,
    });

    this.redis.on('error', (error) => {
      process.stderr.write(
        `[Queue] Redis connection error: ${error instanceof Error ? error.message : String(error)}\n`
      );
    });
  }

  async addEvent(event: AnalyticsEventData): Promise<void> {
    await this.redis.rpush(REDIS_QUEUE_KEY, JSON.stringify(event));

    this.startProcessingTimer();
  }

  private startProcessingTimer(): void {
    if (this.processingTimer) {
      return;
    }

    this.processingTimer = setInterval(() => {
      this.processBatch().catch((error) => {
        process.stderr.write(`[Queue] Timer error: ${error}\n`);
      });
    }, BATCH_INTERVAL_MS);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const eventStrings = await this.fetchEventBatch();

      if (eventStrings.length === 0) {
        this.stopProcessingTimer();
        return;
      }

      const eventsList = this.parseAndValidateEvents(eventStrings);

      if (eventsList.length === 0) {
        return;
      }

      await this.insertEvents(eventsList);

      process.stdout.write(`[Queue] Processed ${eventsList.length} events\n`);
    } catch (error) {
      process.stderr.write(`[Queue] Processing error: ${error}\n`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async fetchEventBatch(): Promise<string[]> {
    const eventStrings: string[] = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const eventString = await this.redis.lpop(REDIS_QUEUE_KEY);
      if (!eventString) {
        break;
      }
      eventStrings.push(eventString);
    }

    return eventStrings;
  }

  private parseAndValidateEvents(eventStrings: string[]): AnalyticsEventData[] {
    const eventsList: AnalyticsEventData[] = [];

    for (const eventString of eventStrings) {
      const parsedEvent = this.parseAndValidateEvent(eventString);
      if (parsedEvent) {
        eventsList.push(parsedEvent);
      }
    }

    return eventsList;
  }

  private parseAndValidateEvent(
    eventString: string
  ): AnalyticsEventData | null {
    try {
      const parsedData = JSON.parse(eventString);
      const validationResult = analyticsEventDataSchema.safeParse(parsedData);

      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        process.stderr.write(
          `[Queue] Validation failed for event: ${eventString.slice(0, 100)}... Errors: ${errorDetails}\n`
        );
        return null;
      }

      return validationResult.data;
    } catch (error) {
      process.stderr.write(
        `[Queue] Failed to parse event JSON: ${eventString.slice(0, 100)}... Error: ${error instanceof Error ? error.message : String(error)}\n`
      );
      return null;
    }
  }

  private async insertEvents(eventsList: AnalyticsEventData[]): Promise<void> {
    const eventsToInsert = eventsList.map((event) => ({
      eventId: event.eventId,
      sessionId: event.sessionId,
      name: event.name,
      params: event.params ? JSON.stringify(event.params) : null,
      timestamp: new Date(event.timestamp),
    }));

    await db.insert(events).values(eventsToInsert).onConflictDoNothing();
  }

  private stopProcessingTimer(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  async getQueueSize(): Promise<number> {
    return await this.redis.llen(REDIS_QUEUE_KEY);
  }

  async flush(): Promise<void> {
    while ((await this.getQueueSize()) > 0) {
      await this.processBatch();
    }
  }

  async close(): Promise<void> {
    if (this.isClosing || this.isClosed) {
      return;
    }

    this.isClosing = true;

    try {
      this.stopProcessingTimer();
      await this.flush();
      await this.redis.quit();
      this.isClosed = true;
    } finally {
      this.isClosing = false;
    }
  }
}

export const analyticsQueue = new SimpleAnalyticsQueue();

export const addAnalyticsEvent = async (
  event: AnalyticsEventData
): Promise<void> => {
  await analyticsQueue.addEvent(event);
};

export const getQueueMetrics = async () => {
  const queueSize = await analyticsQueue.getQueueSize();
  return {
    queueSize,
  };
};

export const closeQueue = async (): Promise<void> => {
  await analyticsQueue.close();
};
