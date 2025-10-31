import { redis, STREAM_KEYS } from './redis';

export { CONSUMER_GROUP, CONSUMER_NAME, STREAM_KEYS } from './redis';

export type QueueItemType = 'event' | 'ping';

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

export type QueueItem = EventQueueItem | PingQueueItem;

export async function addToQueue(item: QueueItem): Promise<void> {
  const streamKey =
    item.type === 'event' ? STREAM_KEYS.EVENTS : STREAM_KEYS.PINGS;

  await redis.xadd(
    streamKey,
    '*',
    'data',
    JSON.stringify(item),
    'timestamp',
    Date.now().toString()
  );
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
      await createConsumerGroup(streamKey, groupName);
      return null;
    }
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
