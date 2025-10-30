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
    if (this.isClosing || this.isClosed) {
      throw new Error(
        'Queue is shutting down or closed; cannot accept new events'
      );
    }

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

      const { validEvents, originalStrings } =
        this.parseAndValidateEvents(eventStrings);

      if (validEvents.length === 0) {
        return;
      }

      await this.insertEvents(validEvents, originalStrings);

      process.stdout.write(`[Queue] Processed ${validEvents.length} events\n`);
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

  private parseAndValidateEvents(eventStrings: string[]): {
    validEvents: AnalyticsEventData[];
    originalStrings: string[];
  } {
    const validEvents: AnalyticsEventData[] = [];
    const originalStrings: string[] = [];

    for (const eventString of eventStrings) {
      const parsedEvent = this.parseAndValidateEvent(eventString);
      if (parsedEvent) {
        validEvents.push(parsedEvent);
        originalStrings.push(eventString);
      }
    }

    return { validEvents, originalStrings };
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

  private async insertEvents(
    eventsList: AnalyticsEventData[],
    originalStrings: string[]
  ): Promise<void> {
    const eventsToInsert = eventsList.map((event) => ({
      eventId: event.eventId,
      sessionId: event.sessionId,
      name: event.name,
      params: event.params ? JSON.stringify(event.params) : null,
      timestamp: new Date(event.timestamp),
    }));

    try {
      await db.insert(events).values(eventsToInsert).onConflictDoNothing();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';

      process.stderr.write(
        `[Queue] CRITICAL: Database insert failed for ${eventsList.length} events. Error: ${errorMessage}\n`
      );
      process.stderr.write(`[Queue] Stack trace: ${errorStack}\n`);
      process.stderr.write(
        `[Queue] Event IDs: ${eventsList.map((e) => e.eventId).join(', ')}\n`
      );

      try {
        await this.requeueEvents(originalStrings);
        process.stdout.write(
          `[Queue] Successfully re-queued ${originalStrings.length} events after DB failure\n`
        );
      } catch (requeueError) {
        const requeueErrorMessage =
          requeueError instanceof Error
            ? requeueError.message
            : String(requeueError);

        process.stderr.write(
          `[Queue] CRITICAL: Failed to re-queue events after DB failure. Events may be lost! Error: ${requeueErrorMessage}\n`
        );
        process.stderr.write(
          `[Queue] Lost events: ${originalStrings.join('\n')}\n`
        );

        throw requeueError;
      }

      throw error;
    }
  }

  private async requeueEvents(eventStrings: string[]): Promise<void> {
    if (eventStrings.length === 0) {
      return;
    }

    const pipeline = this.redis.pipeline();

    for (const eventString of eventStrings) {
      pipeline.rpush(REDIS_QUEUE_KEY, eventString);
    }

    const results = await pipeline.exec();

    if (results) {
      this.validateRequeueResults(results, eventStrings);
    }
  }

  private validateRequeueResults(
    results: [Error | null, unknown][],
    eventStrings: string[]
  ): void {
    for (let i = 0; i < results.length; i++) {
      const [err] = results[i];
      if (err) {
        const eventString = eventStrings[i];
        const errorMessage = err instanceof Error ? err.message : String(err);
        const eventPreview = eventString?.substring(0, 100) ?? 'unknown';
        console.error(
          `[Queue.Requeue] Failed to requeue event at index ${i}:`,
          errorMessage,
          `Event: ${eventPreview}...`
        );
        throw new Error(
          `Failed to requeue event at index ${i}: ${errorMessage}`
        );
      }
    }
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

    this.stopProcessingTimer();

    const maxWaitMs = 30_000;
    const pollIntervalMs = 100;
    const startTime = Date.now();

    while (this.isProcessing) {
      if (Date.now() - startTime > maxWaitMs) {
        process.stderr.write(
          '[Queue] Warning: Timeout waiting for in-flight processing to finish\n'
        );
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    try {
      await this.flush();
    } catch (flushError) {
      process.stderr.write(
        `[Queue] Error during flush: ${flushError instanceof Error ? flushError.message : String(flushError)}\n`
      );
    }

    try {
      await this.redis.quit();
      this.isClosed = true;
    } catch (quitError) {
      process.stderr.write(
        `[Queue] Error during redis.quit(): ${quitError instanceof Error ? quitError.message : String(quitError)}\n`
      );
      this.isClosed = true;
      throw quitError;
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
