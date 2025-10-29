import { randomUUID } from 'node:crypto';
import { type Job, Worker } from 'bullmq';
import { apiEvents, db } from '@/db';
import { getRedisConnection, QUEUE_CONFIG } from './config';
import type { BatchJobData } from './index';

const processBatchJob = async (job: Job<BatchJobData>): Promise<void> => {
  const { events } = job.data;

  const eventsWithIds = events.map((event) => ({
    id: `evt_${randomUUID()}`,
    route: event.route,
    status: event.status,
    processingTimeMs: event.processingTimeMs,
    errorFlag: event.errorFlag,
    timestamp: new Date(event.timestamp),
    version: event.version || '',
    userId: event.userId,
    apikeyId: event.apikeyId,
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
