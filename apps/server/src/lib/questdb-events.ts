const IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;

function resolveTableName(
  value: string | undefined,
  fallback: string,
  envName: string
): string {
  const tableName = value?.trim() || fallback;

  if (!IDENTIFIER_REGEX.test(tableName)) {
    throw new Error(
      `Invalid ${envName}: only alphanumeric characters, hyphens, and underscores are allowed`
    );
  }

  if (tableName.length > 128) {
    throw new Error(`Invalid ${envName}: exceeds maximum length of 128`);
  }

  return tableName;
}

export const QUESTDB_LEGACY_EVENT_TABLE = resolveTableName(
  process.env.QUESTDB_LEGACY_EVENT_TABLE,
  'events',
  'QUESTDB_LEGACY_EVENT_TABLE'
);

export const QUESTDB_EVENT_WRITE_TABLE = resolveTableName(
  process.env.QUESTDB_EVENT_WRITE_TABLE,
  'events_v2',
  'QUESTDB_EVENT_WRITE_TABLE'
);

export const QUESTDB_EVENT_READ_TABLES = [
  ...new Set([QUESTDB_LEGACY_EVENT_TABLE, QUESTDB_EVENT_WRITE_TABLE]),
];
