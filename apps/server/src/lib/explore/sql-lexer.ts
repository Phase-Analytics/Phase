import { ExploreEngineError } from './errors';

type SqlSegmentKind = 'code' | 'string' | 'identifier';

type SqlSegment = { kind: SqlSegmentKind; text: string };

const QUOTE_KINDS: Record<string, SqlSegmentKind> = {
  "'": 'string',
  '"': 'identifier',
};

function readQuoted(sql: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < sql.length) {
    if (sql[index] === quote) {
      if (sql[index + 1] === quote) {
        index += 2;
        continue;
      }
      return index + 1;
    }
    index++;
  }
  throw new ExploreEngineError('Unterminated quoted string or identifier.');
}

/**
 * Splits SQL into code, single-quoted string and double-quoted identifier
 * spans using standard SQL quoting ('' and "" escapes only). This matches
 * how Postgres and QuestDB find literal boundaries as long as the guards in
 * assertSafeSqlLexemes hold (no backslashes, dollar quotes or comments).
 */
function splitSqlSegments(sql: string): SqlSegment[] {
  const segments: SqlSegment[] = [];
  let codeStart = 0;
  let index = 0;

  while (index < sql.length) {
    const kind = QUOTE_KINDS[sql[index] as string];
    if (!kind) {
      index++;
      continue;
    }
    if (index > codeStart) {
      segments.push({ kind: 'code', text: sql.slice(codeStart, index) });
    }
    const end = readQuoted(sql, index, sql[index] as string);
    segments.push({ kind, text: sql.slice(index, end) });
    index = end;
    codeStart = end;
  }

  if (codeStart < sql.length) {
    segments.push({ kind: 'code', text: sql.slice(codeStart) });
  }

  return segments;
}

/**
 * Rejects lexemes where node-sql-parser and the target database could
 * disagree about token boundaries. The executed SQL is regenerated from the
 * parsed AST, so any such disagreement would let text the validator saw as a
 * literal run as SQL.
 */
export function assertSafeSqlLexemes(sql: string): void {
  if (sql.includes('\\')) {
    throw new ExploreEngineError('Backslashes are not allowed in queries.');
  }

  for (const segment of splitSqlSegments(sql)) {
    if (segment.kind !== 'code') {
      continue;
    }
    if (segment.text.includes('--') || segment.text.includes('/*')) {
      throw new ExploreEngineError('SQL comments are not allowed.');
    }
    if (segment.text.includes(';')) {
      throw new ExploreEngineError(
        'Multiple statements are not allowed. Remove semicolons.'
      );
    }
    if (segment.text.includes('$')) {
      throw new ExploreEngineError(
        'Parameters and dollar-quoted strings are not allowed.'
      );
    }
  }
}

/** Applies `transform` to code spans only, leaving literals untouched. */
export function mapSqlCode(
  sql: string,
  transform: (code: string) => string
): string {
  return splitSqlSegments(sql)
    .map((segment) =>
      segment.kind === 'code' ? transform(segment.text) : segment.text
    )
    .join('');
}
