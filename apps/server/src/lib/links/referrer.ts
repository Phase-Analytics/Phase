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
  { match: /(^|\.)fb\.me$/i, label: 'Facebook' },
  { match: /(^|\.)m\.me$/i, label: 'Messenger' },
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

const UA_SOURCE_HINTS: Array<{ match: RegExp; label: string }> = [
  { match: /WhatsApp/i, label: 'WhatsApp' },
  { match: /Telegram/i, label: 'Telegram' },
  { match: /Instagram/i, label: 'Instagram' },
  { match: /FBAN|FBAV|FB_IAB|Messenger/i, label: 'Facebook' },
  { match: /LinkedInApp|LinkedInBot/i, label: 'LinkedIn' },
  { match: /TikTok|musical_ly|BytedanceWebview/i, label: 'TikTok' },
  { match: /Discord/i, label: 'Discord' },
  { match: /Slack/i, label: 'Slack' },
  { match: /Twitter|Tweetbot/i, label: 'X' },
  { match: /Line\//i, label: 'LINE' },
  { match: /Viber/i, label: 'Viber' },
  { match: /Kakao/i, label: 'KakaoTalk' },
  { match: /Snapchat/i, label: 'Snapchat' },
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

function labelFromUserAgent(
  userAgent: string | null | undefined
): string | null {
  if (!userAgent) {
    return null;
  }
  for (const entry of UA_SOURCE_HINTS) {
    if (entry.match.test(userAgent)) {
      return entry.label;
    }
  }
  return null;
}

/**
 * Resolve click attribution from Referer + UTM/ref + in-app UA hints.
 * Messengers often strip Referer; UA still sometimes identifies the app webview.
 */
export function resolveLinkReferrer(options: {
  refererHeader: string | null | undefined;
  requestUrl?: string | null;
  secFetchSite?: string | null;
  userAgent?: string | null;
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

  const fromUa = labelFromUserAgent(options.userAgent);
  if (fromUa) {
    return fromUa;
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
