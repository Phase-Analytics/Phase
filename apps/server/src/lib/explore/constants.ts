export const EXPLORE_DEFAULT_PAGE_SIZE = 100;
export const EXPLORE_MAX_PAGE_SIZE = 1000;
export const EXPLORE_MAX_OFFSET = 100_000;
export const EXPLORE_MAX_STAGED_EVENTS = 250_000;
export const EXPLORE_CATALOG_EVENT_LIMIT = 50;
export const EXPLORE_CATALOG_PARAM_SAMPLE_LIMIT = 100;
export const EXPLORE_MAX_SQL_LENGTH = 10_000;

export const EXPLORE_VIRTUAL_TABLES = [
  'events',
  'devices',
  'sessions',
] as const;

export type ExploreVirtualTable = (typeof EXPLORE_VIRTUAL_TABLES)[number];

export const FORBIDDEN_SQL_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'CREATE',
  'ALTER',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'COPY',
  'EXECUTE',
  'CALL',
  'MERGE',
  'REPLACE',
  'ATTACH',
  'DETACH',
  'PRAGMA',
] as const;
