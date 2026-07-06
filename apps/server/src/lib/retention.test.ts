import { describe, expect, test } from 'bun:test';
import { calculateRetentionSummary } from './retention';

describe('calculateRetentionSummary', () => {
  test('weights rates by cohort size and excludes immature cohorts', () => {
    const summary = calculateRetentionSummary([
      { cohortSize: 100, d1: 20, d3: 10, d7: 5, d14: 2, d30: 1 },
      { cohortSize: 50, d1: 40, d3: 20, d7: null, d14: null, d30: null },
    ]);

    expect(summary).toEqual({
      d1: 26.67,
      d3: 13.33,
      d7: 5,
      d14: 2,
      d30: 1,
    });
  });

  test('returns zero when no cohort is eligible', () => {
    const summary = calculateRetentionSummary([
      {
        cohortSize: 10,
        d1: null,
        d3: null,
        d7: null,
        d14: null,
        d30: null,
      },
    ]);

    expect(summary).toEqual({ d1: 0, d3: 0, d7: 0, d14: 0, d30: 0 });
  });
});
