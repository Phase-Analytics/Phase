import { createHash } from 'node:crypto';
import type { LinkDevicePlatform } from './device';

function normalizeAcceptLanguage(value: string | null): string {
  if (!value) {
    return 'unknown';
  }

  const first = value.split(',')[0]?.trim().toLowerCase();
  return first || 'unknown';
}

export function buildVisitorKey(options: {
  linkId: string;
  platform: LinkDevicePlatform;
  osFamily: string;
  browserFamily: string;
  acceptLanguage: string | null;
  ipHash?: string | null;
}): string {
  const payload = [
    options.linkId,
    options.platform,
    options.osFamily,
    options.browserFamily,
    normalizeAcceptLanguage(options.acceptLanguage),
    options.ipHash?.trim() || 'unknown-ip',
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}
