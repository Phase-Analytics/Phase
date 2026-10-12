import {
  EVENT_TIMESTAMP_FORMAT,
  escapeSqlString,
  executeQuery,
  executeStatement,
  validateTableName,
} from './questdb-client';
import {
  QUESTDB_EVENT_READ_TABLES,
  QUESTDB_EVENT_WRITE_TABLE,
} from './questdb-events';

const QUESTDB_EVENT_WRITE_PARTITION = 'MONTH';

let tablesInitialized = false;
let initPromise: Promise<void> | null = null;
let eventSchemaVerified = false;
let eventSchemaError: string | null = null;

type QuestDBTableMetadata = {
  table_name: string;
  designatedTimestamp: string | null;
  partitionBy: string | null;
  walEnabled: boolean;
  dedup: boolean;
  ttlValue: number | null;
  ttlUnit: string | null;
};

type QuestDBTableColumnMetadata = {
  column: string;
  type: string;
  indexed: boolean;
  designated: boolean;
  upsertKey: boolean;
};

type QuestDBEventTableAggregate = {
  count: number;
  min_timestamp: string | null;
  max_timestamp: string | null;
};

export type QuestDBEventTableDiagnostics = {
  tableName: string;
  rowCount: number;
  minTimestamp: string | null;
  maxTimestamp: string | null;
  partitionBy: string | null;
  walEnabled: boolean;
  dedup: boolean;
  ttlValue: number | null;
  ttlUnit: string | null;
};

export type QuestDBEventStorageDiagnostics = {
  readTables: string[];
  writeTable: string;
  schemaVerified: boolean;
  schemaError: string | null;
  tables: QuestDBEventTableDiagnostics[];
};

function createEventTableQuery(
  tableName: string,
  partitionBy: 'DAY' | 'MONTH'
): string {
  return `
    CREATE TABLE IF NOT EXISTS ${validateTableName(tableName)} (
      event_id VARCHAR,
      session_id SYMBOL INDEX,
      device_id SYMBOL INDEX,
      app_id SYMBOL INDEX,
      name SYMBOL,
      params VARCHAR,
      is_screen BOOLEAN,
      is_debug BOOLEAN,
      timestamp TIMESTAMP
    ) TIMESTAMP(timestamp) PARTITION BY ${partitionBy} WAL DEDUP UPSERT KEYS(timestamp, event_id)
  `;
}

function isOneYearTtl(
  ttlValue: number | null | undefined,
  ttlUnit: string | null | undefined
): boolean {
  const normalizedUnit = ttlUnit?.toUpperCase();

  return (
    (ttlValue === 1 && normalizedUnit === 'YEAR') ||
    (ttlValue === 12 && normalizedUnit === 'MONTH')
  );
}

async function getTableMetadata(
  tableName: string
): Promise<QuestDBTableMetadata | null> {
  const query = `
    SELECT table_name, designatedTimestamp, partitionBy, walEnabled, dedup, ttlValue, ttlUnit
    FROM tables()
    WHERE table_name = '${escapeSqlString(tableName)}'
  `;

  const [table] = await executeQuery<QuestDBTableMetadata>(query);
  return table ?? null;
}

async function getTableColumns(
  tableName: string
): Promise<QuestDBTableColumnMetadata[]> {
  return await executeQuery<QuestDBTableColumnMetadata>(`
    SELECT "column", type, indexed, designated, upsertKey
    FROM table_columns('${escapeSqlString(tableName)}')
  `);
}

function assertTableTtl(
  tableName: string,
  metadata: QuestDBTableMetadata | null
): void {
  if (!metadata) {
    throw new Error(`[QuestDB] Missing expected table: ${tableName}`);
  }

  if (!isOneYearTtl(metadata.ttlValue, metadata.ttlUnit)) {
    throw new Error(
      `[QuestDB] ${tableName} ttl mismatch. Expected 1 YEAR, got ${metadata.ttlValue ?? 'null'} ${metadata.ttlUnit ?? 'null'}`
    );
  }
}

/**
 * `SET TTL` on a WAL table is applied asynchronously, so on a fresh volume the
 * metadata can lag the statement for a moment.
 */
async function getTableMetadataWithTtl(
  tableName: string
): Promise<QuestDBTableMetadata | null> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const metadata = await getTableMetadata(tableName);
    if (metadata && isOneYearTtl(metadata.ttlValue, metadata.ttlUnit)) {
      return metadata;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return await getTableMetadata(tableName);
}

async function verifyWriteTableSchema(tableName: string): Promise<void> {
  const metadata = await getTableMetadataWithTtl(tableName);
  assertTableTtl(tableName, metadata);

  if (metadata?.partitionBy !== QUESTDB_EVENT_WRITE_PARTITION) {
    throw new Error(
      `[QuestDB] ${tableName} partitioning mismatch. Expected ${QUESTDB_EVENT_WRITE_PARTITION}, got ${metadata?.partitionBy ?? 'null'}`
    );
  }

  if (metadata?.designatedTimestamp !== 'timestamp') {
    throw new Error(
      `[QuestDB] ${tableName} designated timestamp mismatch. Expected timestamp, got ${metadata?.designatedTimestamp ?? 'null'}`
    );
  }

  if (!metadata.walEnabled) {
    throw new Error(`[QuestDB] ${tableName} must have WAL enabled`);
  }

  if (!metadata.dedup) {
    throw new Error(`[QuestDB] ${tableName} must have deduplication enabled`);
  }

  const columns = await getTableColumns(tableName);
  const columnMap = new Map(columns.map((column) => [column.column, column]));

  const requiredColumns: Record<
    string,
    {
      type: string;
      indexed?: boolean;
      designated?: boolean;
      upsertKey?: boolean;
    }
  > = {
    event_id: { type: 'VARCHAR', upsertKey: true },
    session_id: { type: 'SYMBOL', indexed: true },
    device_id: { type: 'SYMBOL', indexed: true },
    app_id: { type: 'SYMBOL', indexed: true },
    name: { type: 'SYMBOL', indexed: false },
    params: { type: 'VARCHAR' },
    is_screen: { type: 'BOOLEAN' },
    is_debug: { type: 'BOOLEAN' },
    timestamp: { type: 'TIMESTAMP', designated: true, upsertKey: true },
  };

  for (const [columnName, expected] of Object.entries(requiredColumns)) {
    const actual = columnMap.get(columnName);

    if (!actual) {
      throw new Error(`[QuestDB] ${tableName} is missing column ${columnName}`);
    }

    if (actual.type !== expected.type) {
      throw new Error(
        `[QuestDB] ${tableName}.${columnName} type mismatch. Expected ${expected.type}, got ${actual.type}`
      );
    }

    if (
      expected.indexed !== undefined &&
      Boolean(actual.indexed) !== expected.indexed
    ) {
      throw new Error(
        `[QuestDB] ${tableName}.${columnName} index mismatch. Expected ${expected.indexed}, got ${Boolean(actual.indexed)}`
      );
    }

    if (
      expected.designated !== undefined &&
      Boolean(actual.designated) !== expected.designated
    ) {
      throw new Error(
        `[QuestDB] ${tableName}.${columnName} designated mismatch. Expected ${expected.designated}, got ${Boolean(actual.designated)}`
      );
    }

    if (
      expected.upsertKey !== undefined &&
      Boolean(actual.upsertKey) !== expected.upsertKey
    ) {
      throw new Error(
        `[QuestDB] ${tableName}.${columnName} upsert key mismatch. Expected ${expected.upsertKey}, got ${Boolean(actual.upsertKey)}`
      );
    }
  }
}

export async function initQuestDB(): Promise<void> {
  if (initPromise) {
    return await initPromise;
  }

  if (tablesInitialized) {
    return Promise.resolve();
  }

  initPromise = (async () => {
    try {
      eventSchemaVerified = false;
      eventSchemaError = null;

      console.log(
        `[QuestDB] Event storage config. write=${QUESTDB_EVENT_WRITE_TABLE} read=${QUESTDB_EVENT_READ_TABLES.join(',')}`
      );

      for (const tableName of QUESTDB_EVENT_READ_TABLES) {
        await executeStatement(
          createEventTableQuery(
            tableName,
            tableName === QUESTDB_EVENT_WRITE_TABLE
              ? QUESTDB_EVENT_WRITE_PARTITION
              : 'DAY'
          )
        );
        await executeStatement(
          `ALTER TABLE ${validateTableName(tableName)} ADD COLUMN IF NOT EXISTS is_debug BOOLEAN`
        );
        await executeStatement(
          `ALTER TABLE ${validateTableName(tableName)} SET TTL 1 YEAR`
        );
      }

      for (const tableName of QUESTDB_EVENT_READ_TABLES) {
        const metadata = await getTableMetadataWithTtl(tableName);
        assertTableTtl(tableName, metadata);
      }

      await verifyWriteTableSchema(QUESTDB_EVENT_WRITE_TABLE);

      eventSchemaVerified = true;
      tablesInitialized = true;
      console.log(
        `[QuestDB] Event storage initialized. write=${QUESTDB_EVENT_WRITE_TABLE} read=${QUESTDB_EVENT_READ_TABLES.join(',')} schema=ok retention=1y`
      );
    } catch (error) {
      eventSchemaVerified = false;
      eventSchemaError =
        error instanceof Error ? error.message : 'Unknown schema error';
      console.error('[QuestDB] Initialization failed:', error);
      initPromise = null;
      throw error;
    }
  })();

  return await initPromise;
}

export async function getQuestDBEventStorageDiagnostics(): Promise<QuestDBEventStorageDiagnostics> {
  const tables = await Promise.all(
    QUESTDB_EVENT_READ_TABLES.map(async (tableName) => {
      const [metadata, aggregate] = await Promise.all([
        getTableMetadata(tableName),
        executeQuery<QuestDBEventTableAggregate>(`
          SELECT
            COUNT(*) AS count,
            to_str(min(timestamp), '${EVENT_TIMESTAMP_FORMAT}') AS min_timestamp,
            to_str(max(timestamp), '${EVENT_TIMESTAMP_FORMAT}') AS max_timestamp
          FROM ${validateTableName(tableName)}
        `),
      ]);

      const stats = aggregate[0];

      return {
        tableName,
        rowCount: Number(stats?.count ?? 0),
        minTimestamp: stats?.min_timestamp ?? null,
        maxTimestamp: stats?.max_timestamp ?? null,
        partitionBy: metadata?.partitionBy ?? null,
        walEnabled: metadata?.walEnabled ?? false,
        dedup: metadata?.dedup ?? false,
        ttlValue: metadata?.ttlValue ?? null,
        ttlUnit: metadata?.ttlUnit ?? null,
      } satisfies QuestDBEventTableDiagnostics;
    })
  );

  return {
    readTables: [...QUESTDB_EVENT_READ_TABLES],
    writeTable: QUESTDB_EVENT_WRITE_TABLE,
    schemaVerified: eventSchemaVerified,
    schemaError: eventSchemaError,
    tables,
  };
}
