export const EXPLORE_DEFAULT_PAGE_SIZE = 100;
export const EXPLORE_MAX_PAGE_SIZE = 1000;
export const EXPLORE_MAX_OFFSET = 100_000;
export const EXPLORE_CATALOG_EVENT_LIMIT = 50;
export const EXPLORE_CATALOG_PARAM_SAMPLE_LIMIT = 100;
export const EXPLORE_MAX_SQL_LENGTH = 10_000;

export const EXPLORE_VIRTUAL_TABLES = ['events', 'users', 'sessions'] as const;

export type ExploreVirtualTable = (typeof EXPLORE_VIRTUAL_TABLES)[number];

/** Marks virtual table nodes between AST rewrite and scoped substitution. */
export const EXPLORE_TABLE_PLACEHOLDER_PREFIX = '__phase_explore_';

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
