import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { HttpClient } from '../src/core/client/http-client';
import { BatchSender } from '../src/core/queue/batch-sender';
import { OfflineQueue } from '../src/core/queue/offline-queue';
import { setStorageAdapter } from '../src/core/storage/storage';
import type { BatchItem } from '../src/core/types';
import { STORAGE_KEYS } from '../src/core/types';

const DEVICE_A = '01K00000000000000000000000';
const DEVICE_B = '01K00000000000000000000001';
const SESSION = '01K00000000000000000000010';
const OTHER_SESSION = '01K00000000000000000000011';

type Responder = (items: BatchItem[]) => Response | Promise<Response>;

let stored: Map<string, unknown>;
let requests: BatchItem[][];
const originalFetch = globalThis.fetch;

function respondWith(responder: Responder): void {
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    const { items } = JSON.parse(init.body as string) as {
      items: BatchItem[];
    };
    requests.push(items);
    return await responder(items);
  }) as typeof fetch;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

async function setup(): Promise<{ queue: OfflineQueue; sender: BatchSender }> {
  const queue = new OfflineQueue();
  await queue.initialize();
  const http = new HttpClient('phase_test', 'https://example.test', false);
  return { queue, sender: new BatchSender(http, queue) };
}

function enqueueSession(queue: OfflineQueue, eventCount: number): void {
  queue.enqueue({ type: 'device', payload: { deviceId: DEVICE_A } });
  queue.enqueue({
    type: 'session',
    payload: {
      sessionId: SESSION,
      deviceId: DEVICE_A,
      startedAt: new Date().toISOString(),
    },
  });
  for (let i = 0; i < eventCount; i++) {
    queue.enqueue({
      type: 'event',
      payload: {
        eventId: `01K0000000000000000000${String(i).padStart(4, '0')}`,
        sessionId: SESSION,
        name: `event_${i}`,
        isScreen: false,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

beforeEach(() => {
  stored = new Map();
  requests = [];
  setStorageAdapter({
    getItem: (key) =>
      Promise.resolve({
        success: true,
        data: (stored.get(key) ?? null) as never,
      }),
    setItem: (key, value) => {
      stored.set(key, JSON.parse(JSON.stringify(value)));
      return Promise.resolve({ success: true, data: undefined });
    },
    removeItem: (key) => {
      stored.delete(key);
      return Promise.resolve({ success: true, data: undefined });
    },
    clear: () => {
      stored.clear();
      return Promise.resolve({ success: true, data: undefined });
    },
  });
  // Zero backoff between in-request retries.
  spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  (Math.random as unknown as { mockRestore: () => void }).mockRestore();
});

test('keeps everything, including items enqueued mid-flush, when the request fails', async () => {
  const { queue, sender } = await setup();
  enqueueSession(queue, 3);

  respondWith(() => {
    queue.enqueue({
      type: 'ping',
      payload: { sessionId: SESSION, timestamp: new Date().toISOString() },
    });
    throw new TypeError('Network request failed');
  });

  const outcome = await sender.flush();

  expect(outcome.status).toBe('retry');
  expect(queue.getSize()).toBe(6);
  expect((stored.get(STORAGE_KEYS.OFFLINE_QUEUE) as unknown[]).length).toBe(6);
});

test('207 removes acknowledged and non-retryable items, keeps retryable ones and their dependents', async () => {
  const { queue, sender } = await setup();
  enqueueSession(queue, 3);
  queue.enqueue({
    type: 'ping',
    payload: { sessionId: OTHER_SESSION, timestamp: new Date().toISOString() },
  });
  // clientOrders: device 0, session 1, events 2..4, ping 5

  respondWith(() =>
    json(207, {
      processed: 2,
      failed: 4,
      errors: [
        { clientOrder: 1, code: 'INTERNAL', detail: 'x', retryable: true },
        { clientOrder: 2, code: 'NOT_FOUND', detail: 'x', retryable: false },
        { clientOrder: 3, code: 'NOT_FOUND', detail: 'x', retryable: false },
        // Missing `retryable` means non-retryable.
        { clientOrder: 5, code: 'VALIDATION', detail: 'x' },
      ],
    })
  );

  await sender.flush();

  // The session is retried; its events failed only because of it, so they stay too.
  expect(queue.snapshot().map((item) => item.clientOrder)).toEqual([1, 2, 3]);
});

test('drops an item after repeated retryable failures', async () => {
  const { queue, sender } = await setup();
  queue.enqueue({
    type: 'ping',
    payload: { sessionId: SESSION, timestamp: new Date().toISOString() },
  });
  respondWith((items) =>
    json(207, {
      errors: items.map((item) => ({
        clientOrder: item.clientOrder,
        code: 'INTERNAL',
        detail: 'x',
        retryable: true,
      })),
    })
  );

  for (let i = 0; i < 5; i++) {
    await sender.flush();
  }
  expect(queue.getSize()).toBe(1);

  await sender.flush();
  expect(queue.getSize()).toBe(0);
});

test('keeps items on 5xx and drops them on a non-retryable 4xx', async () => {
  const { queue, sender } = await setup();
  enqueueSession(queue, 1);

  respondWith(() => json(503, {}));
  await sender.flush();
  expect(queue.getSize()).toBe(3);
  expect(requests.length).toBe(3);

  respondWith(() => json(400, { code: 'VALIDATION_ERROR' }));
  await sender.flush();
  expect(queue.getSize()).toBe(0);
});

test('never mixes two devices in one request', async () => {
  const { queue, sender } = await setup();
  enqueueSession(queue, 2);
  queue.enqueue({ type: 'device', payload: { deviceId: DEVICE_B } });

  respondWith(() => json(200, { processed: 1, failed: 0, errors: [] }));
  await sender.flush();

  expect(requests.map((items) => items.length)).toEqual([4, 1]);
  expect(queue.getSize()).toBe(0);
});

test('starts empty instead of failing on a corrupt stored queue', async () => {
  stored.set(STORAGE_KEYS.OFFLINE_QUEUE, { not: 'an array' });
  const { queue } = await setup();
  expect(queue.getSize()).toBe(0);
  expect(stored.has(STORAGE_KEYS.OFFLINE_QUEUE)).toBe(false);
});
