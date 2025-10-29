import { randomUUID } from 'node:crypto';
import { type Job, Worker } from 'bullmq';
import { apiEvents, db } from '@/db';
import { getRedisConnection, QUEUE_CONFIG } from './config';
import type { BatchJobData } from './index';

const processBatchJob = async (job: Job<BatchJobData>): Promise<void> => {
  const { events } = job.data;

  // Filter out events without required fields (backward compatibility)
  const validEvents = events.filter((event) => {
    if (!(event.userId && event.apikeyId)) {
      console.warn(
        '[Worker] Skipping event without userId/apikeyId (legacy event):',
        { route: event.route, timestamp: event.timestamp }
      );
      return false;
    }
    return true;
  });

  if (validEvents.length === 0) {
    console.warn('[Worker] No valid events to process in batch');
    return;
  }

  const eventsWithIds = validEvents.map((event) => ({
    id: `evt_${randomUUID()}`,
    route: event.route,
    status: event.status,
    processingTimeMs: event.processingTimeMs,
    errorFlag: event.errorFlag,
    timestamp: new Date(event.timestamp),
    version: event.version || '',
    // Safe to assert non-null because we filtered above
    userId: event.userId as string,
    apikeyId: event.apikeyId as string,
  }));

  await db.insert(apiEvents).values(eventsWithIds);
};

export const createApiEventsWorker = (): Worker<BatchJobData> => {
  const worker = new Worker<BatchJobData>(
    QUEUE_CONFIG.QUEUE_NAME,
    processBatchJob,
    {
      connection: getRedisConnection(),
      concurrency: QUEUE_CONFIG.CONCURRENCY,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    }
  );

  return worker;
};
