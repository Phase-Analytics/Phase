import { redis, redisQueue, STREAM_KEYS } from './redis';

export { CONSUMER_GROUP, CONSUMER_NAME, STREAM_KEYS } from './redis';

export type QueueItemType = 'event' | 'ping' | 'error';

export type EventQueueItem = {
  type: 'event';
  eventId: string;
  sessionId: string;
  name: string;
  params?: Record<string, string | number | boolean | null>;
  timestamp: string;
};

export type PingQueueItem = {
  type: 'ping';
  sessionId: string;
  timestamp: string;
};

export type ErrorQueueItem = {
  type: 'error';
  errorId: string;
  sessionId: string;
  message: string;
  errorType: string;
  stackTrace?: string;
  timestamp: string;
};

export type QueueItem = EventQueueItem | PingQueueItem | ErrorQueueItem;

export async function addToQueue(item: QueueItem): Promise<void> {
  let streamKey: string;
  if (item.type === 'event') {
    streamKey = STREAM_KEYS.EVENTS;
  } else if (item.type === 'ping') {
    streamKey = STREAM_KEYS.PINGS;
  } else {
    streamKey = STREAM_KEYS.ERRORS;
  }

  await redisQueue.xadd(
    streamKey,
    '*',
    'data',
    JSON.stringify(item),
    'timestamp',
    Date.now().toString()
  );
}

export async function addBatchToQueue(items: QueueItem[]): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const pipeline = redisQueue.pipeline();

  for (const item of items) {
    let streamKey: string;
    if (item.type === 'event') {
      streamKey = STREAM_KEYS.EVENTS;
    } else if (item.type === 'ping') {
      streamKey = STREAM_KEYS.PINGS;
    } else {
      streamKey = STREAM_KEYS.ERRORS;
    }

    pipeline.xadd(
      streamKey,
      '*',
      'data',
      JSON.stringify(item),
      'timestamp',
      Date.now().toString()
    );
  }

  const results = await pipeline.exec();
  if (!results) {
    throw new Error('Pipeline execution failed');
  }

  const errors = results
    .map((r, i) =>
      r[0] ? { index: i, item: items[i], error: r[0].message } : null
    )
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (errors.length > 0) {
    throw new Error(
      `Failed to add ${errors.length} of ${items.length} items to queue: ${JSON.stringify(errors)}`
    );
  }
}

type ReadFromStreamOptions = {
  streamKey: string;
  groupName: string;
  consumerName: string;
  count: number;
  blockMs: number;
};

export async function readFromStream(
  options: ReadFromStreamOptions
): Promise<{ id: string; data: QueueItem }[] | null> {
  const { streamKey, groupName, consumerName, count, blockMs } = options;

  try {
    const result = await redis.xreadgroup(
      'GROUP',
      groupName,
      consumerName,
      'COUNT',
      count.toString(),
      'BLOCK',
      blockMs.toString(),
      'STREAMS',
      streamKey,
      '>'
    );

    if (!result || result.length === 0) {
      return null;
    }

    const streamResult = result[0];
    if (!Array.isArray(streamResult) || streamResult.length < 2) {
      return null;
    }

    const entries = streamResult[1] as [string, string[]][];
    if (!entries || entries.length === 0) {
      return null;
    }

    return entries.map(([id, fields]) => {
      const dataIndex = fields.indexOf('data');
      if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
        throw new Error(`Missing 'data' field in stream entry ${id}`);
      }

      const dataJson = fields[dataIndex + 1];
      let data: QueueItem;
      try {
        data = JSON.parse(dataJson) as QueueItem;
      } catch (error) {
        throw new Error(
          `Failed to parse data for entry ${id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      return { id, data };
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('NOGROUP')) {
      console.log(
        `[Queue] Consumer group '${groupName}' not found for stream '${streamKey}', creating...`
      );
      await createConsumerGroup(streamKey, groupName);
      return null;
    }
    console.error(`[Queue] Error reading from stream '${streamKey}':`, error);
    throw error;
  }
}

export async function createConsumerGroup(
  streamKey: string,
  groupName: string
): Promise<void> {
  try {
    await redis.xgroup('CREATE', streamKey, groupName, '0', 'MKSTREAM');
  } catch (error) {
    if (error instanceof Error && error.message.includes('BUSYGROUP')) {
      return;
    }
    throw error;
  }
}

export async function acknowledgeMessage(
  streamKey: string,
  groupName: string,
  messageId: string
): Promise<void> {
  await redis.xack(streamKey, groupName, messageId);
}

export async function acknowledgeBatchMessages(
  messages: { streamKey: string; groupName: string; messageId: string }[]
): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const pipeline = redis.pipeline();

  for (const { streamKey, groupName, messageId } of messages) {
    pipeline.xack(streamKey, groupName, messageId);
  }

  const results = await pipeline.exec();
  if (!results) {
    throw new Error('Pipeline execution failed');
  }

  const errors = results
    .map((r, i) =>
      r[0] ? { index: i, message: messages[i], error: r[0].message } : null
    )
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (errors.length > 0) {
    throw new Error(
      `Failed to acknowledge ${errors.length} of ${messages.length} messages: ${JSON.stringify(errors)}`
    );
  }
}
