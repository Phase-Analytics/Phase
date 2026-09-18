import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import {
  buildExploreEventsSubquery,
  getEventById,
  getEventStats,
  getEvents,
  getEventTimeseries,
  getTopEvents,
} from './questdb';
import { QUESTDB_EVENT_READ_TABLES } from './questdb-events';

afterEach(() => {
  mock.restore();
});

function captureQueries(): string[] {
  const queries: string[] = [];
  const capture = (input: Parameters<typeof fetch>[0]): Promise<Response> => {
    const url = new URL(String(input));
    queries.push(url.searchParams.get('query') ?? '');
    return Promise.resolve(
      Response.json({ columns: [], dataset: [], count: 0 })
    );
  };
  spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(capture, { preconnect: globalThis.fetch.preconnect })
  );
  return queries;
}

function readsAllTables(query: string): boolean {
  return QUESTDB_EVENT_READ_TABLES.every((table) =>
    query.includes(`FROM ${table}\n`)
  );
}

describe('event reads across storage tables', () => {
  test.each([
    ['2026-01-01T00:00:00.000001Z', '2026-01-02T00:00:00.000002Z'],
    ['2026-09-01T00:00:00.000001Z', '2026-09-02T00:00:00.000002Z'],
  ])(
    'explore applies the exact range %s through %s to every table',
    (startDate, endDate) => {
      const conditions = ["app_id = 'test-app'"];
      const query = buildExploreEventsSubquery({
        selectClause: 'timestamp',
        conditions,
        startDate,
        endDate,
      });
      expect(readsAllTables(query)).toBe(true);
      for (const branch of query.split('UNION ALL')) {
        expect(branch).toContain(`timestamp >= '${startDate}'`);
        expect(branch).toContain(`timestamp <= '${endDate}'`);
        expect(branch).toContain("app_id = 'test-app'");
        expect(branch).toContain('COALESCE(is_debug, false) = false');
      }
      expect(conditions).toEqual(["app_id = 'test-app'"]);
    }
  );

  test('explore rejects an invalid date instead of dropping the bound', () => {
    expect(() =>
      buildExploreEventsSubquery({
        selectClause: 'timestamp',
        conditions: [],
        startDate: 'not-a-date',
      })
    ).toThrow('Invalid startDate');
  });

  test('lists and totals search all tables without rounding timestamp bounds', async () => {
    const queries = captureQueries();
    const startDate = '2026-01-01T00:00:00.123456Z';
    const endDate = '2026-01-02T00:00:00.654321Z';
    await getEvents({ appId: 'test-app', startDate, endDate });
    expect(queries).toHaveLength(2);
    for (const query of queries) {
      expect(readsAllTables(query)).toBe(true);
      expect(query).toContain(`timestamp >= '${startDate}'`);
      expect(query).toContain(`timestamp <= '${endDate}'`);
    }
  });

  test.each(['01ARZ3NDEKTSV4RRFFQ69G5FAV', '01KZZZZZZZTSV4RRFFQ69G5FAV'])(
    'event detail searches both tables regardless of the ULID timestamp: %s',
    async (eventId) => {
      const queries = captureQueries();
      await getEventById({ appId: 'test-app', eventId });
      expect(queries).toHaveLength(1);
      expect(readsAllTables(queries[0])).toBe(true);
      expect(queries[0]).toContain(`event_id = '${eventId}'`);
      expect(queries[0]).toContain("app_id = 'test-app'");
    }
  );

  test('top events, statistics and timeseries all include both stores', async () => {
    const queries = captureQueries();
    const options = {
      appId: 'test-app',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-01-02T00:00:00Z',
    };
    await getTopEvents(options);
    await getEventStats(options);
    await getEventTimeseries(options);
    expect(queries).toHaveLength(7);
    for (const query of queries) {
      expect(readsAllTables(query)).toBe(true);
    }
  });
});
