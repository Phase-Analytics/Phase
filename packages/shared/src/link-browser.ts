export type LinkBrowserFamily =
  | 'chrome'
  | 'firefox'
  | 'safari'
  | 'other'
  | 'unknown';

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function formatLinkBrowserFamilyLabel(
  family: LinkBrowserFamily | string
): string {
  switch (family) {
    case 'chrome':
      return 'Chrome';
    case 'firefox':
      return 'Firefox';
    case 'safari':
      return 'Safari';
    case 'other':
      return 'Other';
    default:
      return 'Unknown';
  }
}

function hasChromiumUaSignals(ua: string): boolean {
  return includesAny(ua, [
    'chrome/',
    'crios/',
    'chromium',
    'edg/',
    'edgios/',
    'opr/',
  ]);
}

function familyFromEngine(
  engine: string,
  ua: string
): LinkBrowserFamily | null {
  if (engine.includes('gecko')) {
    return 'firefox';
  }

  if (engine.includes('blink') || engine.includes('chromium')) {
    return 'chrome';
  }

  if (engine.includes('webkit')) {
    return hasChromiumUaSignals(ua) ? 'chrome' : 'safari';
  }

  return null;
}

function familyFromUa(ua: string): LinkBrowserFamily | null {
  if (includesAny(ua, ['firefox/', 'fxios/', 'gecko/'])) {
    return 'firefox';
  }

  if (hasChromiumUaSignals(ua) || ua.includes('chromium')) {
    return 'chrome';
  }

  if (
    ua.includes('safari') &&
    !includesAny(ua, ['chrome', 'chromium', 'crios', 'fxios'])
  ) {
    return 'safari';
  }

  if (
    includesAny(ua, ['iphone', 'ipad', 'mac os']) &&
    !hasChromiumUaSignals(ua) &&
    !includesAny(ua, ['firefox', 'fxios'])
  ) {
    return 'safari';
  }

  return null;
}

export function normalizeLinkBrowserFamily(
  browserName: string,
  userAgent?: string | null,
  engineName?: string | null
): LinkBrowserFamily {
  const ua = (userAgent ?? '').toLowerCase();
  const engine = (engineName ?? '').toLowerCase();
  const browser = browserName.trim().toLowerCase();

  const fromEngine = familyFromEngine(engine, ua);
  if (fromEngine) {
    return fromEngine;
  }

  const fromUa = familyFromUa(ua);
  if (fromUa) {
    return fromUa;
  }

  if (browser.includes('gecko')) {
    return 'firefox';
  }

  if (browser.includes('webkit') && !hasChromiumUaSignals(ua)) {
    return 'safari';
  }

  if (
    browser.includes('blink') ||
    browser.includes('chromium') ||
    browser.includes('chrome')
  ) {
    return 'chrome';
  }

  if (browser && browser !== 'unknown') {
    return 'other';
  }

  return 'unknown';
}
