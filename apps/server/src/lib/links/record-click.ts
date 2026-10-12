import { randomUUID } from 'node:crypto';
import { getLocationFromIP } from '@/lib/geolocation';
import { checkLinkRedirectRateLimit } from '@/lib/rate-limit';
import { sseManager } from '@/lib/sse-manager';
import type { CachedLinkConfig } from './cache';
import { type BufferedLinkClick, getLinkClickBuffer } from './click-buffer';
import type { ParsedLinkUserAgent } from './device';

/**
 * Records one human click off the response path. Past the per-IP threshold
 * (shared venue Wi-Fi, QR codes) the visitor is still redirected; the click
 * just is not counted.
 */
export async function recordLinkClick(input: {
  link: CachedLinkConfig;
  clientIp: string | null;
  userAgent: ParsedLinkUserAgent;
  visitorKey: string;
  referrer: string;
  domainHost: string;
}): Promise<void> {
  const buffer = getLinkClickBuffer();
  if (!buffer) {
    return;
  }

  if (input.clientIp) {
    const rateLimit = await checkLinkRedirectRateLimit(input.clientIp);
    if (!rateLimit.allowed) {
      return;
    }
  }

  const { link, userAgent } = input;
  const countryCode = input.clientIp
    ? (getLocationFromIP(input.clientIp)?.countryCode ?? null)
    : null;

  const click: BufferedLinkClick = {
    clickId: randomUUID(),
    appId: link.appId,
    linkId: link.id,
    visitorKey: input.visitorKey,
    countryCode,
    os: userAgent.osFamily,
    browser: userAgent.browserFamily,
    platform: userAgent.platform,
    referrer: input.referrer,
    domainHost: input.domainHost,
    timestamp: new Date().toISOString(),
  };

  await buffer.push(click);

  sseManager.pushLinkClick(link.appId, {
    clickId: click.clickId,
    linkId: link.id,
    linkName: link.name?.trim() || link.slug,
    timestamp: click.timestamp,
    countryCode,
    os: click.os,
    browser: click.browser,
  });
}
