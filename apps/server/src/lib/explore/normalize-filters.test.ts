import { describe, expect, test } from 'bun:test';
import { normalizeExploreFilter } from './normalize-filters';

describe('normalizeExploreFilter', () => {
  test('maps device_property country to device country column', () => {
    expect(
      normalizeExploreFilter({
        type: 'device_property',
        key: 'country',
        operator: 'eq',
        value: 'TR',
      })
    ).toEqual({
      type: 'device',
      field: 'country',
      operator: 'eq',
      value: 'TR',
    });
  });
});
