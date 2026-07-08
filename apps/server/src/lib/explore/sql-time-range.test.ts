import { describe, expect, test } from 'bun:test';
import {
  EXPLORE_DEFAULT_RANGE_DAYS,
  resolveDefaultExploreDateRange,
  resolveExploreDateRangeForSql,
  sqlHasExplicitTimeFilter,
} from './time-range';

describe('sqlHasExplicitTimeFilter', () => {
  test('detects timestamp filters', () => {
    expect(
      sqlHasExplicitTimeFilter(
        "SELECT * FROM events WHERE timestamp >= '2024-01-01'"
      )
    ).toBe(true);
  });

  test('returns false without time predicates', () => {
    expect(
      sqlHasExplicitTimeFilter(
        'SELECT name, count(*) FROM events GROUP BY name'
      )
    ).toBe(false);
  });
});

describe('resolveExploreDateRangeForSql', () => {
  test('returns default range when SQL has no time filter', () => {
    const range = resolveExploreDateRangeForSql(
      'SELECT user_id FROM users LIMIT 10'
    );
    expect(range).not.toBeNull();

    const start = new Date(range?.startDate).getTime();
    const end = new Date(range?.endDate).getTime();
    const diffDays = (end - start) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(EXPLORE_DEFAULT_RANGE_DAYS - 0.1);
    expect(diffDays).toBeLessThan(EXPLORE_DEFAULT_RANGE_DAYS + 0.1);
  });

  test('returns null when SQL includes explicit time filter', () => {
    expect(
      resolveExploreDateRangeForSql(
        "SELECT * FROM events WHERE timestamp >= '2024-01-01' LIMIT 10"
      )
    ).toBeNull();
  });
});

describe('resolveDefaultExploreDateRange', () => {
  test('ends at now', () => {
    const range = resolveDefaultExploreDateRange();
    const end = new Date(range.endDate).getTime();
    const now = Date.now();
    expect(Math.abs(end - now)).toBeLessThan(5000);
  });
});
