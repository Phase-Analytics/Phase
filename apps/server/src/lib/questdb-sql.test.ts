import { describe, expect, test } from 'bun:test';
import { assertExploreEventName, escapeQuestDbString } from './questdb-sql';

describe('escapeQuestDbString', () => {
  test('escapes single quotes', () => {
    expect(escapeQuestDbString("x' OR 1=1 --")).toBe("x'' OR 1=1 --");
  });

  test('escapes backslashes', () => {
    expect(escapeQuestDbString(String.raw`a\b`)).toBe(String.raw`a\\b`);
  });
});

describe('assertExploreEventName', () => {
  test('allows typical analytics event names', () => {
    expect(() => assertExploreEventName('paywall_clicked')).not.toThrow();
    expect(() => assertExploreEventName('screen.view')).not.toThrow();
  });

  test('rejects SQL injection payloads', () => {
    expect(() => assertExploreEventName("x' OR 1=1 --")).toThrow();
  });
});
