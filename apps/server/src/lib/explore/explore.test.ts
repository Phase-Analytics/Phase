import { describe, expect, test } from 'bun:test';
import { EXPLORE_DEFAULT_PAGE_SIZE, EXPLORE_MAX_PAGE_SIZE } from './constants';
import { ExploreEngineError } from './errors';
import {
  applyExplorePagination,
  parseExploreSql,
  validateExplorePage,
} from './sql-validate';

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
});

describe('applyExplorePagination', () => {
  test('appends limit and offset to the query', () => {
    const { sql, offset, fetchSize } = applyExplorePagination(
      'SELECT user_id FROM users',
      100,
      3
    );
    expect(sql).toBe('SELECT user_id FROM users LIMIT 101 OFFSET 200');
    expect(offset).toBe(200);
    expect(fetchSize).toBe(101);
  });
});

describe('validateExplorePage', () => {
  test('rejects pages beyond max offset', () => {
    expect(() => validateExplorePage(2000, 100)).toThrow(ExploreEngineError);
  });
});
