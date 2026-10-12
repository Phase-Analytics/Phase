import { describe, expect, test } from 'bun:test';
import { EXPLORE_DEFAULT_PAGE_SIZE, EXPLORE_MAX_PAGE_SIZE } from './constants';
import { ExploreEngineError } from './errors';
import { rewriteExploreSql } from './sql-rewrite';
import {
  applyExplorePagination,
  parseExploreSql,
  validateExplorePage,
} from './sql-validate';

function rewrite(sql: string) {
  return rewriteExploreSql(parseExploreSql(sql), {
    appId: 'app_test',
    dateRange: null,
  });
}

describe('rewriteExploreSql', () => {
  test('rewrites quoted virtual table names', () => {
    const { sql, target } = rewrite(
      'SELECT timestamp, user_id, name AS "event_name" FROM "events" ORDER BY timestamp DESC'
    );

    expect(target).toBe('questdb');
    expect(sql).toContain('AS user_id');
    expect(sql).not.toContain('FROM "events"');
  });

  test('resolves Apple machine ids in the users virtual table model column', () => {
    const { sql, target } = rewrite(
      'SELECT model, count(*) AS count FROM users GROUP BY model'
    );

    expect(target).toBe('postgres');
    expect(sql).toContain("WHEN model = 'iPhone17,1' THEN 'iPhone 16 Pro'");
    expect(sql).toContain('AS model');
  });

  test('scopes every table reference, including nested subqueries', () => {
    const { sql } = rewrite(
      'SELECT * FROM (SELECT app_id, name FROM events) t WHERE EXISTS (SELECT 1 FROM "events")'
    );

    const rawReads = sql.match(/FROM\s+"?events(?:_v2)?"?/gi) ?? [];
    const scopedReads =
      sql.match(/FROM events(?:_v2)?\s+WHERE app_id = 'app_test'/g) ?? [];
    expect(rawReads.length).toBe(4);
    expect(scopedReads.length).toBe(rawReads.length);
  });

  test('scopes every postgres table reference, including nested subqueries', () => {
    const { sql, target } = rewrite(
      'SELECT * FROM (SELECT user_id FROM users) t WHERE EXISTS (SELECT 1 FROM "users")'
    );

    expect(target).toBe('postgres');
    const rawReads = sql.match(/FROM\s+"?devices"?/gi) ?? [];
    const scopedReads =
      sql.match(/FROM devices\s+WHERE app_id = 'app_test'/g) ?? [];
    expect(rawReads.length).toBe(2);
    expect(scopedReads.length).toBe(rawReads.length);
  });

  test('keeps QuestDB long casts executable', () => {
    const { sql } = rewrite(
      "SELECT cast(json_extract(params, '$.level_number') AS long) % 5 AS r FROM events"
    );

    expect(sql).toContain('AS BIGINT');
  });
});

describe('explore sandbox', () => {
  const escapes = [
    'SELECT * FROM (events)',
    'SELECT * FROM/**/events',
    'SELECT * FROM events -- comment',
    'SELECT * FROM public.events',
    'SELECT * FROM sys.tables',
    'SELECT * FROM events_v2',
    "SELECT * FROM read_parquet('/etc/passwd')",
    'SELECT * FROM tables()',
    'WITH x AS (SELECT * FROM events) SELECT * FROM x',
    'SELECT * INTO stolen FROM users',
    "SELECT 'a\\' FROM users",
    'SELECT $$x$$ FROM users',
    "SELECT 'apps'::regclass AS x FROM users",
    "SELECT CAST('postgres' AS regrole) AS x FROM users",
  ];

  for (const sql of escapes) {
    test(`rejects ${sql}`, () => {
      expect(() => rewrite(sql)).toThrow(ExploreEngineError);
    });
  }

  const forbiddenFunctions = [
    "query_to_xml('select * from apps', true, true, '')",
    "query_to_xml_and_xmlschema('select 1', true, true, '')",
    "table_to_xml('apps', true, true, '')",
    "set_config('role', 'postgres', false)",
    "current_setting('server_version')",
    'pg_sleep(10)',
    'pg_catalog.pg_sleep(10)',
    '"pg_sleep"(10)',
    "pg_read_file('/etc/passwd')",
    "pg_ls_dir('.')",
    'lo_import(1)',
    "dblink('x', 'y')",
    'pg_terminate_backend(1)',
    "files('/')",
    "glob('/*')",
    'sysdate()',
    "table_columns('events')",
  ];

  for (const call of forbiddenFunctions) {
    test(`rejects ${call}`, () => {
      expect(() => rewrite(`SELECT ${call} AS x FROM users`)).toThrow(
        ExploreEngineError
      );
    });
  }
});

describe('parseExploreSql', () => {
  test('uses default page size when LIMIT is omitted', () => {
    const parsed = parseExploreSql('SELECT user_id FROM users');
    expect(parsed.pageSize).toBe(EXPLORE_DEFAULT_PAGE_SIZE);
    expect([...parsed.tables]).toEqual(['users']);
  });

  test('respects LIMIT as page size', () => {
    const parsed = parseExploreSql(
      'SELECT name, count(*) AS count FROM events GROUP BY name LIMIT 50'
    );
    expect(parsed.pageSize).toBe(50);
    expect(rewrite('SELECT name FROM events LIMIT 50').sql).not.toContain(
      'LIMIT'
    );
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

  test('rejects JOIN syntax', () => {
    expect(() =>
      parseExploreSql(
        'SELECT e.name FROM events e JOIN users u ON e.user_id = u.user_id LIMIT 10'
      )
    ).toThrow(ExploreEngineError);
  });

  test('rejects multi-table queries', () => {
    expect(() =>
      parseExploreSql('SELECT * FROM events, users LIMIT 10')
    ).toThrow(ExploreEngineError);
  });

  test('parses questdb long cast and the documented level example', () => {
    const sql = `SELECT avg(cast(json_extract(params, '$.duration_seconds') AS double)) AS avg_duration_seconds
FROM events
WHERE name = 'level_win'
  AND cast(json_extract(params, '$.level_number') AS long) % 5 = 0
LIMIT 100`;

    const parsed = parseExploreSql(sql);

    expect(parsed.pageSize).toBe(100);
    const { sql: rewritten } = rewrite(sql);
    expect(rewritten).toContain('AS BIGINT) % 5 = 0');
    expect(rewritten).not.toContain('LIMIT');
  });
});

describe('applyExplorePagination', () => {
  test('appends postgres limit and offset to the query', () => {
    const { sql, offset, fetchSize } = applyExplorePagination(
      'SELECT user_id FROM users',
      100,
      3,
      'postgres'
    );
    expect(sql).toBe('SELECT user_id FROM users LIMIT 101 OFFSET 200');
    expect(offset).toBe(200);
    expect(fetchSize).toBe(101);
  });

  test('uses questdb limit syntax on the first page', () => {
    const { sql } = applyExplorePagination(
      'SELECT user_id FROM events',
      100,
      1,
      'questdb'
    );
    expect(sql).toBe('SELECT user_id FROM events LIMIT 101');
  });

  test('uses questdb range limit syntax on later pages', () => {
    const { sql } = applyExplorePagination(
      'SELECT user_id FROM events',
      100,
      3,
      'questdb'
    );
    expect(sql).toBe('SELECT user_id FROM events LIMIT 200, 301');
  });
});

describe('validateExplorePage', () => {
  test('rejects pages beyond max offset', () => {
    expect(() => validateExplorePage(2000, 100)).toThrow(ExploreEngineError);
  });
});
