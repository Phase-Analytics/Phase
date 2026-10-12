import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import Redis from 'ioredis';
import { ulid } from 'ulid';
import { type BufferedEvent, EventBuffer } from './event-buffer';

// Needs a disposable Redis, e.g.
//   docker run -d --rm -p 6390:6379 redis:8-alpine
//   TEST_REDIS_URL=redis://localhost:6390 bun test src/lib/event-buffer.test.ts
const redisUrl = process.env.TEST_REDIS_URL;

const EVENT_COUNT = 2500;

describe.skipIf(!redisUrl)('EventBuffer drain against Redis', () => {
  const written: string[] = [];
  let requests = 0;
  let questdb: ReturnType<typeof Bun.serve>;
  let admin: Redis;
  let replicas: EventBuffer[] = [];

  async function clearEventKeys() {
    const keys = await admin.keys('events:*');
    if (keys.length > 0) {
      await admin.del(...keys);
    }
  }

  beforeAll(async () => {
    admin = new Redis(redisUrl as string);
    await clearEventKeys();

    questdb = Bun.serve({
      port: 0,
      async fetch(request) {
        const body = await request.text();
        requests++;
        // The first write fails transiently; its chunk must be requeued.
        if (requests === 1) {
          return new Response('unavailable', { status: 503 });
        }
        for (const line of body.split('\n')) {
          const eventId = /event_id="([^"]+)"/.exec(line)?.[1];
          if (eventId) {
            written.push(eventId);
          }
        }
        return new Response(null, { status: 204 });
      },
    });

    const questdbUrl = `http://localhost:${questdb.port}`;
    replicas = [
      new EventBuffer(redisUrl as string, { questdbUrl }),
      new EventBuffer(redisUrl as string, { questdbUrl }),
    ];
  });

  afterAll(async () => {
    await Promise.all(
      replicas.map((replica) => replica.flushAndClose(Date.now()))
    );
    await clearEventKeys();
    await admin.quit();
    questdb.stop(true);
  });

  test('two replicas write every buffered event exactly once', async () => {
    const startedAt = Date.now();
    const events: BufferedEvent[] = Array.from(
      { length: EVENT_COUNT },
      (_, index) => ({
        eventId: ulid(),
        sessionId: 'session-test',
        deviceId: 'device-test',
        appId: 'app-test',
        name: `event_${index % 7}`,
        params: { index },
        isScreen: false,
        isDebug: false,
        timestamp: new Date(startedAt + index).toISOString(),
      })
    );

    for (let offset = 0; offset < events.length; offset += 250) {
      const slice = events.slice(offset, offset + 250);
      const replica = replicas[(offset / 250) % 2] as EventBuffer;
      await replica.pushMany(slice);
    }

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      await Promise.all(replicas.map((replica) => replica.flush()));
      if ((await replicas[0]?.getBufferSize()) === 0) {
        break;
      }
      // Wait out the backoff triggered by the failed write.
      await Bun.sleep(1100);
    }

    expect(await replicas[0]?.getBufferSize()).toBe(0);
    expect(written.length).toBe(EVENT_COUNT);
    expect(new Set(written)).toEqual(
      new Set(events.map((event) => event.eventId))
    );
  }, 20_000);
});
