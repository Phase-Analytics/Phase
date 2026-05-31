import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { QUESTDB_LINK_CLICKS_TABLE } from './constants';
import type { LinkDevicePlatform } from './device';
import { normalizeReferrer } from './referrer';

const QUESTDB_HTTP = 'http://questdb:9000';
const BUFFER_KEY = 'link_clicks:buffer';
const FLUSH_KEY = 'link_clicks:flushing';
const FLUSH_INTERVAL_MS = 2000;
const BATCH_SIZE = 500;
const QUESTDB_TIMEOUT_MS = 10_000;

export type BufferedLinkClick = {
  clickId: string;
  appId: string;
  linkId: string;
  visitorKey: string;
  countryCode: string | null;
  region: string | null;
  os: string;
  browser: string;
  platform: LinkDevicePlatform;
  referrer: string | null;
  domainHost: string;
  timestamp: string;
};

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
  const tags = [
    `app_id=${escapeILPTag(click.appId)}`,
    `link_id=${escapeILPTag(click.linkId)}`,
    `visitor_key=${escapeILPTag(click.visitorKey)}`,
    `country_code=${escapeILPTag(click.countryCode ?? 'unknown')}`,
    `region=${escapeILPTag(click.region ?? 'unknown')}`,
    `os=${escapeILPTag(click.os)}`,
    `browser=${escapeILPTag(click.browser)}`,
    `platform=${escapeILPTag(click.platform)}`,
    `referrer=${escapeILPTag(normalizeReferrer(click.referrer))}`,
    `domain_host=${escapeILPTag(click.domainHost)}`,
  ].join(',');

  const fields = [`click_id="${escapeILPString(click.clickId)}"`].join(',');
  const timestampNanos = new Date(click.timestamp).getTime() * 1_000_000;

  return `${QUESTDB_LINK_CLICKS_TABLE},${tags} ${fields} ${timestampNanos}`;
}

class LinkClickBuffer {
  private readonly redis: Redis;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
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

  async push(click: Omit<BufferedLinkClick, 'clickId'>): Promise<void> {
    const entry: BufferedLinkClick = {
      ...click,
      clickId: randomUUID(),
    };
    await this.redis.rpush(BUFFER_KEY, JSON.stringify(entry));
  }

  private async writeILP(ilpData: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUESTDB_TIMEOUT_MS);

    try {
      const response = await fetch(`${QUESTDB_HTTP}/write`, {
        method: 'POST',
        body: ilpData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QuestDB error: ${response.status} - ${errorText}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async flush(): Promise<void> {
    const lock = await this.redis.set(FLUSH_KEY, '1', 'EX', 30, 'NX');
    if (lock !== 'OK') {
      return;
    }

    try {
      const rawEvents = await this.redis.lrange(BUFFER_KEY, 0, BATCH_SIZE - 1);
      if (rawEvents.length === 0) {
        return;
      }

      const clicks: BufferedLinkClick[] = [];
      for (const raw of rawEvents) {
        try {
          clicks.push(JSON.parse(raw) as BufferedLinkClick);
        } catch {
          // skip malformed
        }
      }

      if (clicks.length === 0) {
        await this.redis.ltrim(BUFFER_KEY, rawEvents.length, -1);
        return;
      }

      const ilpData = clicks.map((click) => buildILPLine(click)).join('\n');
      await this.writeILP(ilpData);
      await this.redis.ltrim(BUFFER_KEY, clicks.length, -1);
    } catch (error) {
      console.error('[LinkClickBuffer] Flush failed:', error);
    } finally {
      await this.redis.del(FLUSH_KEY);
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

export async function initLinkClicksTable(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS link_clicks (
      click_id VARCHAR,
      app_id SYMBOL INDEX,
      link_id SYMBOL INDEX,
      visitor_key SYMBOL,
      country_code SYMBOL,
      region SYMBOL,
      os SYMBOL,
      browser SYMBOL,
      platform SYMBOL,
      referrer SYMBOL,
      domain_host SYMBOL,
      timestamp TIMESTAMP
    ) TIMESTAMP(timestamp) PARTITION BY MONTH WAL;
  `;

  const response = await fetch(
    `http://questdb:9000/exec?query=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to init link_clicks table: ${text}`);
  }

  const alterResponse = await fetch(
    `http://questdb:9000/exec?query=${encodeURIComponent('ALTER TABLE link_clicks ADD COLUMN region SYMBOL;')}`
  );

  if (!alterResponse.ok) {
    const text = await alterResponse.text();
    if (!text.includes('already exists')) {
      console.warn(`[LinkClicks] region column migration: ${text}`);
    }
  }
}
