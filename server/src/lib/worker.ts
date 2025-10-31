import { db, events, pool } from '@/db';
import {
  acknowledgeBatchMessages,
  acknowledgeMessage,
  CONSUMER_GROUP,
  CONSUMER_NAME,
  createConsumerGroup,
  type EventQueueItem,
  type PingQueueItem,
  type QueueItem,
  readFromStream,
  STREAM_KEYS,
} from './queue';
import { redis } from './redis';

const BATCH_MAX_SIZE = 100;
const BATCH_WAIT_TIME_MS = 8000;
const XREAD_BLOCK_MS = 1000;

type BatchEntry = {
  id: string;
  streamKey: string;
  data: QueueItem;
  receivedAt: number;
};

type SessionActivity = {
  sessionId: string;
  timestamp: Date;
};

function extractTimestamp(item: QueueItem): number {
  if (item.type === 'event') {
    return new Date((item as EventQueueItem).timestamp).getTime();
  }
  return new Date((item as PingQueueItem).timestamp).getTime();
}

async function insertEvents(
  eventsToInsert: {
    eventId: string;
    sessionId: string;
    name: string;
    params: string | null;
    timestamp: Date;
  }[]
): Promise<{ success: boolean; insertedCount: number }> {
  if (eventsToInsert.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const result = await db
      .insert(events)
      .values(eventsToInsert)
      .onConflictDoNothing({ target: events.eventId });
    return { success: true, insertedCount: result.rowCount ?? 0 };
  } catch (error) {
    console.error('[Worker] Failed to insert events:', error);
    return { success: false, insertedCount: 0 };
  }
}

async function updateSessionActivities(
  sessionActivities: Map<string, SessionActivity>
): Promise<{ success: boolean; updatedCount: number }> {
  if (sessionActivities.size === 0) {
    return { success: true, updatedCount: 0 };
  }

  const sessionUpdates = Array.from(sessionActivities.values());

  try {
    const values = sessionUpdates
      .map(
        (_, index) => `($${index * 2 + 1}::text, $${index * 2 + 2}::timestamp)`
      )
      .join(', ');

    const params: (string | Date)[] = [];
    for (const activity of sessionUpdates) {
      params.push(activity.sessionId, activity.timestamp);
    }

    const query = `
      UPDATE sessions_analytics s
      SET last_activity_at = v.timestamp
      FROM (VALUES ${values}) AS v(session_id, timestamp)
      WHERE s.session_id = v.session_id
    `;

    const result = await pool.query(query, params);
    return { success: true, updatedCount: result.rowCount ?? 0 };
  } catch (error) {
    console.error('[Worker] Failed to batch update sessions:', error);
    return { success: false, updatedCount: 0 };
  }
}

function processEventItem(
  entry: BatchEntry,
  eventsToInsert: {
    eventId: string;
    sessionId: string;
    name: string;
    params: string | null;
    timestamp: Date;
  }[],
  sessionActivities: Map<string, SessionActivity>
): void {
  const eventData = entry.data as EventQueueItem;
  const timestamp = new Date(eventData.timestamp);

  eventsToInsert.push({
    eventId: eventData.eventId,
    sessionId: eventData.sessionId,
    name: eventData.name,
    params: eventData.params ? JSON.stringify(eventData.params) : null,
    timestamp,
  });

  const existing = sessionActivities.get(eventData.sessionId);
  if (!existing || timestamp > existing.timestamp) {
    sessionActivities.set(eventData.sessionId, {
      sessionId: eventData.sessionId,
      timestamp,
    });
  }
}

function processPingItem(
  entry: BatchEntry,
  sessionActivities: Map<string, SessionActivity>
): void {
  const pingData = entry.data as PingQueueItem;
  const timestamp = new Date(pingData.timestamp);

  const existing = sessionActivities.get(pingData.sessionId);
  if (!existing || timestamp > existing.timestamp) {
    sessionActivities.set(pingData.sessionId, {
      sessionId: pingData.sessionId,
      timestamp,
    });
  }
}

function processBatchItems(batch: BatchEntry[]): {
  eventsToInsert: {
    eventId: string;
    sessionId: string;
    name: string;
    params: string | null;
    timestamp: Date;
  }[];
  sessionActivities: Map<string, SessionActivity>;
} {
  const eventsToInsert: {
    eventId: string;
    sessionId: string;
    name: string;
    params: string | null;
    timestamp: Date;
  }[] = [];

  const sessionActivities = new Map<string, SessionActivity>();

  for (const entry of batch) {
    if (entry.data.type === 'event') {
      processEventItem(entry, eventsToInsert, sessionActivities);
    } else if (entry.data.type === 'ping') {
      processPingItem(entry, sessionActivities);
    }
  }

  return { eventsToInsert, sessionActivities };
}

async function acknowledgeBatchEntries(batch: BatchEntry[]): Promise<number> {
  if (batch.length === 0) {
    return 0;
  }

  try {
    const ackMessages = batch.map((entry) => ({
      streamKey: entry.streamKey,
      groupName: CONSUMER_GROUP,
      messageId: entry.id,
    }));

    await acknowledgeBatchMessages(ackMessages);
    return batch.length;
  } catch (error) {
    console.error('[Worker] Failed to acknowledge batch:', error);

    let ackedCount = 0;
    for (const entry of batch) {
      try {
        await acknowledgeMessage(entry.streamKey, CONSUMER_GROUP, entry.id);
        ackedCount++;
      } catch (err) {
        console.error(
          `[Worker] Failed to acknowledge message ${entry.id}:`,
          err
        );
      }
    }
    return ackedCount;
  }
}

async function trimStreams(batch: BatchEntry[]): Promise<void> {
  const streamKeys = new Set(batch.map((entry) => entry.streamKey));

  for (const streamKey of streamKeys) {
    try {
      await redis.xtrim(streamKey, 'MAXLEN', '~', 50_000);
    } catch (error) {
      console.error(`[Worker] Failed to trim stream ${streamKey}:`, error);
    }
  }
}

async function processBatch(batch: BatchEntry[]): Promise<boolean> {
  if (batch.length === 0) {
    return true;
  }

  const { eventsToInsert, sessionActivities } = processBatchItems(batch);

  const [eventsResult, sessionsResult] = await Promise.all([
    insertEvents(eventsToInsert),
    updateSessionActivities(sessionActivities),
  ]);

  if (!(eventsResult.success && sessionsResult.success)) {
    console.error(
      '[Worker] Critical failure in batch processing, messages not acknowledged'
    );
    return false;
  }

  if (eventsResult.insertedCount < eventsToInsert.length) {
    const duplicateCount = eventsToInsert.length - eventsResult.insertedCount;
    console.log(
      `[Worker] ${duplicateCount} duplicate events skipped (expected with onConflictDoNothing)`
    );
  }

  if (sessionsResult.updatedCount < sessionActivities.size) {
    const failedCount = sessionActivities.size - sessionsResult.updatedCount;
    console.warn(
      `[Worker] ${failedCount} sessions failed to update (may not exist in DB)`
    );
  }

  const ackedCount = await acknowledgeBatchEntries(batch);
  await trimStreams(batch);

  console.log(`[Worker] Acknowledged ${ackedCount}/${batch.length} messages`);

  return ackedCount === batch.length;
}

async function collectBatch(
  entries: { id: string; data: QueueItem }[],
  streamKey: string,
  startTime: number
): Promise<BatchEntry[]> {
  const batch: BatchEntry[] = entries.map((entry) => ({
    id: entry.id,
    streamKey,
    data: entry.data,
    receivedAt: Date.now(),
  }));

  if (batch.length >= BATCH_MAX_SIZE) {
    return batch.sort(
      (a, b) => extractTimestamp(a.data) - extractTimestamp(b.data)
    );
  }

  const elapsed = Date.now() - startTime;
  const remainingWait = Math.max(0, BATCH_WAIT_TIME_MS - elapsed);

  if (remainingWait > 0 && batch.length > 0) {
    await new Promise((resolve) => {
      setTimeout(resolve, remainingWait);
    });

    const additionalEntries = await readFromStream({
      streamKey,
      groupName: CONSUMER_GROUP,
      consumerName: CONSUMER_NAME,
      count: BATCH_MAX_SIZE - batch.length,
      blockMs: 0,
    });

    if (additionalEntries && additionalEntries.length > 0) {
      for (const entry of additionalEntries) {
        batch.push({
          id: entry.id,
          streamKey,
          data: entry.data,
          receivedAt: Date.now(),
        });
      }
    }
  }

  return batch.sort(
    (a, b) => extractTimestamp(a.data) - extractTimestamp(b.data)
  );
}

async function processStream(streamKey: string): Promise<void> {
  try {
    const entries = await readFromStream({
      streamKey,
      groupName: CONSUMER_GROUP,
      consumerName: CONSUMER_NAME,
      count: BATCH_MAX_SIZE,
      blockMs: XREAD_BLOCK_MS,
    });

    if (!entries || entries.length === 0) {
      return;
    }

    const startTime = Date.now();
    const batch = await collectBatch(entries, streamKey, startTime);

    if (batch.length === 0) {
      return;
    }

    const success = await processBatch(batch);
    if (success) {
      console.log(
        `[Worker] Successfully processed batch of ${batch.length} items (stream: ${streamKey})`
      );
    }
  } catch (error) {
    console.error(`[Worker] Error processing stream ${streamKey}:`, error);
  }
}

export async function startWorker(): Promise<{
  stop: () => Promise<void>;
}> {
  await Promise.all([
    createConsumerGroup(STREAM_KEYS.EVENTS, CONSUMER_GROUP),
    createConsumerGroup(STREAM_KEYS.PINGS, CONSUMER_GROUP),
  ]);

  console.log('[Worker] Started batch processor');

  let shouldStop = false;
  let loopPromise: Promise<void> | null = null;

  const sigtermHandler = () => {
    console.log('[Worker] Received SIGTERM, shutting down gracefully...');
    shouldStop = true;
  };

  const sigintHandler = () => {
    console.log('[Worker] Received SIGINT, shutting down gracefully...');
    shouldStop = true;
  };

  process.on('SIGTERM', sigtermHandler);
  process.on('SIGINT', sigintHandler);

  async function runLoop(): Promise<void> {
    while (!shouldStop) {
      try {
        await Promise.all([
          processStream(STREAM_KEYS.EVENTS),
          processStream(STREAM_KEYS.PINGS),
        ]);
      } catch (error) {
        console.error('[Worker] Error in main loop:', error);
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      }
    }
    console.log('[Worker] Shutdown complete');
  }

  loopPromise = runLoop().catch((error) => {
    console.error('[Worker] Fatal error:', error);
    throw error;
  });

  return {
    stop: async () => {
      shouldStop = true;
      process.off('SIGTERM', sigtermHandler);
      process.off('SIGINT', sigintHandler);
      if (loopPromise) {
        await loopPromise;
      }
    },
  };
}
