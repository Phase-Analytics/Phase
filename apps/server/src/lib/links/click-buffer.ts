import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { executeQuestDBReadQuery } from '@/lib/questdb';
import { incrementLinkClickTotals } from './click-totals';
import { QUESTDB_LINK_CLICKS_TABLE } from './constants';
import type { LinkDevicePlatform } from './device';

const QUESTDB_HTTP = 'http://questdb:9000';
const BUFFER_KEY = 'link_clicks:buffer';
const DEAD_LETTER_KEY = 'link_clicks:dead';
const DEAD_LETTER_MAX = 10_000;
const FLUSH_KEY = 'link_clicks:flushing';
const FLUSH_LOCK_TTL_MS = 30_000;
const FLUSH_INTERVAL_MS = 2000;
const MAX_DRAIN_MS = 15_000;
const BATCH_SIZE = 500;
const MAX_REJECTED_LINES_PER_BATCH = 5;
const QUESTDB_TIMEOUT_MS = 10_000;

/** Attacker-influenced, high-cardinality columns stored as VARCHAR, not SYMBOL. */
const TEXT_COLUMNS = ['visitor_key', 'referrer'] as const;

const RELEASE_LOCK_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

export type BufferedLinkClick = {
  clickId: string;
  appId: string;
  linkId: string;
  visitorKey: string;
  countryCode: string | null;
  os: string;
  browser: string;
  platform: LinkDevicePlatform;
  referrer: string | null;
  domainHost: string;
  timestamp: string;
};

type BufferEntry = { raw: string; click: BufferedLinkClick };

class QuestDbWriteError extends Error {
  readonly status: number;
  readonly line: number | null;

  constructor(status: number, body: string) {
    super(`QuestDB write failed: ${status} - ${body}`);
    this.status = status;
    this.line = parseErrorLine(body);
  }

  /** The batch itself is bad; retrying it unchanged can never succeed. */
  get isPermanent(): boolean {
    return (
      this.status >= 400 &&
      this.status < 500 &&
      this.status !== 408 &&
      this.status !== 429
    );
  }
}

function parseErrorLine(body: string): number | null {
  try {
    const line = (JSON.parse(body) as { line?: unknown }).line;
    return typeof line === 'number' && Number.isInteger(line) ? line : null;
  } catch {
    return null;
  }
}

let textColumnsAsFields = false;

function escapeILPTag(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/=/g, '\\=')
    .replace(/\s/g, '\\ ');
}

function escapeILPString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildILPLine(click: BufferedLinkClick): string {
  const referrer = click.referrer?.trim() || 'direct';
  const tags = [
    `app_id=${escapeILPTag(click.appId)}`,
    `link_id=${escapeILPTag(click.linkId)}`,
    `country_code=${escapeILPTag(click.countryCode ?? 'unknown')}`,
    `os=${escapeILPTag(click.os)}`,
    `browser=${escapeILPTag(click.browser)}`,
    `platform=${escapeILPTag(click.platform)}`,
    `domain_host=${escapeILPTag(click.domainHost)}`,
  ];
  const fields = [`click_id="${escapeILPString(click.clickId)}"`];

  if (textColumnsAsFields) {
    fields.push(
      `visitor_key="${escapeILPString(click.visitorKey)}"`,
      `referrer="${escapeILPString(referrer)}"`
    );
  } else {
    tags.push(
      `visitor_key=${escapeILPTag(click.visitorKey)}`,
      `referrer=${escapeILPTag(referrer)}`
    );
  }

  const timestampNanos = new Date(click.timestamp).getTime() * 1_000_000;
  return `${QUESTDB_LINK_CLICKS_TABLE},${tags.join(',')} ${fields.join(',')} ${timestampNanos}`;
}

function parseEntries(rawEvents: string[]): {
  entries: BufferEntry[];
  malformed: string[];
} {
  const entries: BufferEntry[] = [];
  const malformed: string[] = [];
  for (const raw of rawEvents) {
    try {
      entries.push({ raw, click: JSON.parse(raw) as BufferedLinkClick });
    } catch {
      malformed.push(raw);
    }
  }
  return { entries, malformed };
}

class LinkClickBuffer {
  private readonly redis: Redis;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      commandTimeout: 2000,
    });
    this.redis.on('error', (error) => {
      console.error('[LinkClickBuffer] Redis error:', error.message);
    });
  }

  start() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.flush().catch((error) => {
        console.error('[LinkClickBuffer] Interval flush failed:', error);
      });
    }, FLUSH_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async push(click: BufferedLinkClick): Promise<void> {
    await this.redis.rpush(BUFFER_KEY, JSON.stringify(click));
  }

  private async writeILP(ilpData: string): Promise<void> {
    const response = await fetch(`${QUESTDB_HTTP}/write`, {
      method: 'POST',
      body: ilpData,
      signal: AbortSignal.timeout(QUESTDB_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new QuestDbWriteError(response.status, await response.text());
    }
  }

  /**
   * QuestDB rejects the whole HTTP batch when one line is bad and reports the
   * offending line. Drop that line (dead-letter) and retry the rest, so one
   * poisoned entry cannot block or take down its neighbours.
   */
  private async writeEntries(
    entries: BufferEntry[]
  ): Promise<{ written: BufferEntry[]; rejected: string[] }> {
    let pending = entries;
    const rejected: string[] = [];

    while (pending.length > 0) {
      try {
        await this.writeILP(pending.map((e) => buildILPLine(e.click)).join('\n'));
        return { written: pending, rejected };
      } catch (error) {
        if (!(error instanceof QuestDbWriteError && error.isPermanent)) {
          throw error;
        }

        console.error('[LinkClickBuffer] QuestDB rejected batch:', error.message);
        const index = error.line === null ? -1 : error.line - 1;
        const bad = pending[index];
        if (!bad || rejected.length >= MAX_REJECTED_LINES_PER_BATCH) {
          rejected.push(...pending.map((e) => e.raw));
          return { written: [], rejected };
        }
        rejected.push(bad.raw);
        pending = pending.filter((_, i) => i !== index);
      }
    }

    return { written: [], rejected };
  }

  private async processBatch(rawEvents: string[]): Promise<void> {
    const { entries, malformed } = parseEntries(rawEvents);
    const { written, rejected } = await this.writeEntries(entries);
    const deadLetters = [...malformed, ...rejected];

    const tx = this.redis.multi();
    if (deadLetters.length > 0) {
      console.error(
        `[LinkClickBuffer] Dead-lettering ${deadLetters.length} click(s) to ${DEAD_LETTER_KEY}`
      );
      tx.rpush(DEAD_LETTER_KEY, ...deadLetters).ltrim(
        DEAD_LETTER_KEY,
        -DEAD_LETTER_MAX,
        -1
      );
    }
    tx.ltrim(BUFFER_KEY, rawEvents.length, -1);
    await tx.exec();

    incrementLinkClickTotals(written.map((e) => e.click.linkId)).catch(
      (error) => {
        console.error('[LinkClickBuffer] Click total update failed:', error);
      }
    );
  }

  private async flush(): Promise<void> {
    const token = randomUUID();
    const lock = await this.redis.set(
      FLUSH_KEY,
      token,
      'PX',
      FLUSH_LOCK_TTL_MS,
      'NX'
    );
    if (lock !== 'OK') {
      return;
    }

    const startedAt = Date.now();
    try {
      while (Date.now() - startedAt < MAX_DRAIN_MS) {
        const rawEvents = await this.redis.lrange(
          BUFFER_KEY,
          0,
          BATCH_SIZE - 1
        );
        if (rawEvents.length === 0) {
          break;
        }
        await this.processBatch(rawEvents);
        if (rawEvents.length < BATCH_SIZE) {
          break;
        }
      }
    } catch (error) {
      console.error('[LinkClickBuffer] Flush failed:', error);
    } finally {
      await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, FLUSH_KEY, token);
    }
  }
}

let linkClickBuffer: LinkClickBuffer | null = null;

export function initLinkClickBuffer(redisUrl: string): LinkClickBuffer {
  if (!linkClickBuffer) {
    linkClickBuffer = new LinkClickBuffer(redisUrl);
    linkClickBuffer.start();
  }
  return linkClickBuffer;
}

export function getLinkClickBuffer(): LinkClickBuffer | null {
  return linkClickBuffer;
}

async function getTextColumnTypes(): Promise<Map<string, string>> {
  const rows = await executeQuestDBReadQuery<{ column: string; type: string }>(
    `SELECT "column", type FROM table_columns('${QUESTDB_LINK_CLICKS_TABLE}')`
  );
  return new Map(
    rows
      .filter((row) => (TEXT_COLUMNS as readonly string[]).includes(row.column))
      .map((row) => [row.column, row.type])
  );
}

/**
 * Older deployments created visitor_key/referrer as SYMBOL, which grows the
 * symbol table without bound on attacker-controlled values. QuestDB (9.1)
 * converts SYMBOL -> VARCHAR in place on WAL tables, keeping existing rows.
 * Idempotent: columns that are already VARCHAR are left alone.
 */
async function ensureTextColumns(): Promise<void> {
  for (const [column, type] of await getTextColumnTypes()) {
    if (type === 'SYMBOL') {
      console.log(
        `[LinkClicks] Converting ${QUESTDB_LINK_CLICKS_TABLE}.${column} SYMBOL -> VARCHAR`
      );
      await executeQuestDBReadQuery(
        `ALTER TABLE ${QUESTDB_LINK_CLICKS_TABLE} ALTER COLUMN ${column} TYPE VARCHAR`
      );
    }
  }

  const types = await getTextColumnTypes();
  textColumnsAsFields = TEXT_COLUMNS.every((column) => {
    const type = types.get(column);
    return type === 'VARCHAR' || type === 'STRING';
  });
  if (!textColumnsAsFields) {
    console.error(
      '[LinkClicks] visitor_key/referrer are not VARCHAR; writing them as symbols',
      Object.fromEntries(types)
    );
  }
}

export async function initLinkClicksTable(): Promise<void> {
  await executeQuestDBReadQuery(`
    CREATE TABLE IF NOT EXISTS ${QUESTDB_LINK_CLICKS_TABLE} (
      click_id VARCHAR,
      app_id SYMBOL INDEX,
      link_id SYMBOL INDEX,
      visitor_key VARCHAR,
      country_code SYMBOL,
      os SYMBOL,
      browser SYMBOL,
      platform SYMBOL,
      referrer VARCHAR,
      domain_host SYMBOL,
      timestamp TIMESTAMP
    ) TIMESTAMP(timestamp) PARTITION BY MONTH WAL;
  `);

  try {
    await ensureTextColumns();
  } catch (error) {
    textColumnsAsFields = false;
    console.error(
      '[LinkClicks] Text column migration failed; writing them as symbols:',
      error
    );
  }
}
