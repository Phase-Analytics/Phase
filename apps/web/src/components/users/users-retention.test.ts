import { describe, expect, test } from 'bun:test';
import { buildCumulativeRetentionData } from './users-retention';

describe('buildCumulativeRetentionData', () => {
  test('adds cohorts when a period matures and carries the running rate forward', () => {
    const data = buildCumulativeRetentionData([
      {
        date: '2026-01-01',
        cohortSize: 100,
        d1: 20,
        d3: null,
        d7: null,
        d14: null,
        d30: null,
      },
      {
        date: '2026-01-02',
        cohortSize: 100,
        d1: 40,
        d3: null,
        d7: null,
        d14: null,
        d30: null,
      },
    ]);

    expect(data.find((point) => point.date === '2026-01-02')?.d1).toBe(20);
    expect(data.find((point) => point.date === '2026-01-03')?.d1).toBe(30);
    expect(data.find((point) => point.date === '2026-01-04')?.d1).toBe(30);
    expect(data.find((point) => point.date === '2026-01-04')?.d7).toBe(0);
  });
});
