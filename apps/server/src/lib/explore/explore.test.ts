import { describe, expect, test } from 'bun:test';
import { EXPLORE_DEFAULT_PAGE_SIZE, EXPLORE_MAX_PAGE_SIZE } from './constants';
import { ExploreEngineError } from './errors';
import { rewriteExploreSql } from './sql-rewrite';
import {
  applyExplorePagination,
  parseExploreSql,
  validateExplorePage,
} from './sql-validate';

describe('rewriteExploreSql', () => {
  test('rewrites quoted virtual table names produced by sqlify', () => {
    const { sql, target } = rewriteExploreSql(
      'SELECT timestamp, user_id, name AS "event_name" FROM "events" ORDER BY timestamp DESC',
      new Set(['events']),
      { appId: 'app_test', dateRange: null }
    );

    expect(target).toBe('questdb');
    expect(sql).toContain('AS user_id');
    expect(sql).not.toContain('FROM "events"');
  });
});

describe('parseExploreSql', () => {
  test('uses default page size when LIMIT is omitted', () => {
    const parsed = parseExploreSql('SELECT user_id FROM users');
    expect(parsed.pageSize).toBe(EXPLORE_DEFAULT_PAGE_SIZE);
    expect(parsed.baseSql.toLowerCase()).toContain('users');
  });

  test('respects LIMIT as page size', () => {
    const parsed = parseExploreSql(
      'SELECT name, count(*) AS count FROM events GROUP BY name LIMIT 50'
    );
    expect(parsed.pageSize).toBe(50);
    expect(parsed.baseSql.toUpperCase()).not.toContain('LIMIT');
  });

  test('rejects LIMIT above max page size', () => {
    expect(() =>
      parseExploreSql(
        `SELECT user_id FROM users LIMIT ${EXPLORE_MAX_PAGE_SIZE + 1}`
      )
    ).toThrow(ExploreEngineError);
  });

  test('rejects OFFSET in user SQL', () => {
    expect(() =>
      parseExploreSql('SELECT user_id FROM users LIMIT 10 OFFSET 5')
    ).toThrow(ExploreEngineError);
  });

  test('rejects unknown tables', () => {
    expect(() => parseExploreSql('SELECT * FROM secrets LIMIT 10')).toThrow(
      ExploreEngineError
    );
  });

  test('rejects non-select statements via keywords', () => {
    expect(() => parseExploreSql('DELETE FROM users')).toThrow(
      ExploreEngineError
    );
  });

  test('rejects legacy devices table name', () => {
    expect(() =>
      parseExploreSql('SELECT user_id FROM devices LIMIT 10')
    ).toThrow(ExploreEngineError);
  });

  test('rejects legacy device_id column name', () => {
    expect(() =>
      parseExploreSql('SELECT device_id FROM users LIMIT 10')
    ).toThrow(ExploreEngineError);
  });

  test('parses questdb long cast and keeps original sql for execution', () => {
    const sql = `SELECT avg(cast(json_extract(params, '$.duration_seconds') AS double)) AS avg_duration_seconds
FROM events
WHERE name = 'level_win'
  AND cast(json_extract(params, '$.level_number') AS long) % 5 = 0
LIMIT 100`;

    const parsed = parseExploreSql(sql);

    expect(parsed.pageSize).toBe(100);
    expect(parsed.baseSql).toContain('AS long');
    expect(parsed.baseSql).toContain('% 5 = 0');
    expect(parsed.baseSql.toUpperCase()).not.toContain('LIMIT');
  });
});

describe('applyExplorePagination', () => {
  test('appends postgres limit and offset to the query', () => {
    const { sql, offset, fetchSize } = applyExplorePagination(
      'SELECT user_id FROM users',
      100,
      3,
      'postgres'
    );
    expect(sql).toBe('SELECT user_id FROM users LIMIT 101 OFFSET 200');
    expect(offset).toBe(200);
    expect(fetchSize).toBe(101);
  });

  test('uses questdb limit syntax on the first page', () => {
    const { sql } = applyExplorePagination(
      'SELECT user_id FROM events',
      100,
      1,
      'questdb'
    );
    expect(sql).toBe('SELECT user_id FROM events LIMIT 101');
  });

  test('uses questdb range limit syntax on later pages', () => {
    const { sql } = applyExplorePagination(
      'SELECT user_id FROM events',
      100,
      3,
      'questdb'
    );
    expect(sql).toBe('SELECT user_id FROM events LIMIT 200, 301');
  });
});

describe('validateExplorePage', () => {
  test('rejects pages beyond max offset', () => {
    expect(() => validateExplorePage(2000, 100)).toThrow(ExploreEngineError);
  });
});
