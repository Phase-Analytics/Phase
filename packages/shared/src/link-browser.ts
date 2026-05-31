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
    'opera',
  ]);
}

function familyFromUaProductTokens(ua: string): LinkBrowserFamily | null {
  if (includesAny(ua, ['fxios', 'firefox/'])) {
    return 'firefox';
  }

  if (hasChromiumUaSignals(ua)) {
    return 'chrome';
  }

  return null;
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
    const fromTokens = familyFromUaProductTokens(ua);
    if (fromTokens) {
      return fromTokens;
    }

    if (
      ua.includes('safari') &&
      !includesAny(ua, ['chrome', 'chromium', 'crios', 'fxios'])
    ) {
      return 'safari';
    }
  }

  return null;
}

function familyFromBrowserName(browser: string): LinkBrowserFamily | null {
  if (!browser || browser === 'unknown') {
    return null;
  }

  if (browser.includes('firefox')) {
    return 'firefox';
  }

  if (
    browser.includes('chrome') ||
    browser.includes('chromium') ||
    browser.includes('edg') ||
    browser.includes('opera') ||
    browser.includes('opr') ||
    browser.includes('brave')
  ) {
    return 'chrome';
  }

  if (browser.includes('safari')) {
    return 'safari';
  }

  return 'other';
}

export function normalizeLinkBrowserFamily(
  browserName: string,
  userAgent?: string | null,
  engineName?: string | null
): LinkBrowserFamily {
  const ua = (userAgent ?? '').toLowerCase();
  const engine = (engineName ?? '').toLowerCase();
  const browser = browserName.trim().toLowerCase();

  const fromUaTokens = familyFromUaProductTokens(ua);
  if (fromUaTokens) {
    return fromUaTokens;
  }

  const fromEngine = familyFromEngine(engine, ua);
  if (fromEngine) {
    return fromEngine;
  }

  const fromBrowser = familyFromBrowserName(browser);
  if (fromBrowser) {
    return fromBrowser;
  }

  return 'unknown';
}
