import { type Job, Worker } from 'bullmq';
import { db, events } from '@/db';
import { getRedisConnection, QUEUE_CONFIG } from './config';
import type { BatchJobData } from './index';

const processBatchJob = async (job: Job<BatchJobData>): Promise<void> => {
  const { events: eventsList } = job.data;

  if (eventsList.length === 0) {
    console.warn('[Worker] No events to process in batch');
    return;
  }

  const eventsToInsert = eventsList.map((event) => ({
    eventId: event.eventId,
    sessionId: event.sessionId,
    name: event.name,
    params: event.params ? JSON.stringify(event.params) : null,
    timestamp: new Date(event.timestamp),
  }));

  await db.insert(events).values(eventsToInsert);
};

export const createAnalyticsEventsWorker = (): Worker<BatchJobData> => {
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
