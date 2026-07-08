const WWW_PREFIX = /^www\./;

const KNOWN_REFERRER_HOSTS: Array<{ match: RegExp; label: string }> = [
  { match: /(^|\.)whatsapp\.com$/i, label: 'WhatsApp' },
  { match: /(^|\.)wa\.me$/i, label: 'WhatsApp' },
  { match: /(^|\.)t\.me$/i, label: 'Telegram' },
  { match: /(^|\.)telegram\.(org|me)$/i, label: 'Telegram' },
  { match: /(^|\.)twitter\.com$/i, label: 'X' },
  { match: /(^|\.)x\.com$/i, label: 'X' },
  { match: /(^|\.)facebook\.com$/i, label: 'Facebook' },
  { match: /(^|\.)fb\.com$/i, label: 'Facebook' },
  { match: /(^|\.)instagram\.com$/i, label: 'Instagram' },
  { match: /(^|\.)linkedin\.com$/i, label: 'LinkedIn' },
  { match: /(^|\.)reddit\.com$/i, label: 'Reddit' },
  { match: /(^|\.)youtube\.com$/i, label: 'YouTube' },
  { match: /(^|\.)youtu\.be$/i, label: 'YouTube' },
  { match: /(^|\.)tiktok\.com$/i, label: 'TikTok' },
  { match: /(^|\.)discord\.com$/i, label: 'Discord' },
  { match: /(^|\.)discord\.gg$/i, label: 'Discord' },
  { match: /(^|\.)slack\.com$/i, label: 'Slack' },
  { match: /(^|\.)google\./i, label: 'Google' },
  { match: /(^|\.)bing\.com$/i, label: 'Bing' },
  { match: /(^|\.)duckduckgo\.com$/i, label: 'DuckDuckGo' },
];

function hostFromUrl(value: string): string | null {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function labelForHost(host: string): string {
  for (const entry of KNOWN_REFERRER_HOSTS) {
    if (entry.match.test(host)) {
      return entry.label;
    }
  }
  return host.replace(WWW_PREFIX, '');
}

/**
 * Resolve click attribution from Referer + common in-app / UTM signals.
 * Many messengers (WhatsApp, iMessage, etc.) strip Referer; UTM and
 * client hints are the practical fallback.
 */
export function resolveLinkReferrer(options: {
  refererHeader: string | null | undefined;
  requestUrl?: string | null;
  secFetchSite?: string | null;
}): string {
  const referer = options.refererHeader?.trim();
  if (referer) {
    const lower = referer.toLowerCase();
    if (lower !== 'direct' && lower !== '(direct)' && lower !== 'null') {
      const host = hostFromUrl(referer);
      if (host) {
        return labelForHost(host);
      }
      return referer.slice(0, 120);
    }
  }

  if (options.requestUrl) {
    try {
      const url = new URL(options.requestUrl);
      const utmSource = url.searchParams.get('utm_source')?.trim();
      if (utmSource) {
        return utmSource.slice(0, 64);
      }
      const ref = url.searchParams.get('ref')?.trim();
      if (ref) {
        return ref.slice(0, 64);
      }
    } catch {
      // ignore invalid request URL
    }
  }

  const site = options.secFetchSite?.trim().toLowerCase();
  if (site === 'cross-site' || site === 'same-site') {
    return 'external';
  }

  return 'direct';
}

/** @deprecated Prefer resolveLinkReferrer for new click paths */
export function normalizeReferrer(referrer: string | null | undefined): string {
  return resolveLinkReferrer({ refererHeader: referrer });
}
