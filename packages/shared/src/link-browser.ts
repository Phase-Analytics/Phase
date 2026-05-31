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

export function normalizeLinkBrowserFamily(
  browserName: string,
  userAgent?: string | null,
  engineName?: string | null
): LinkBrowserFamily {
  const ua = (userAgent ?? '').toLowerCase();
  const engine = (engineName ?? '').toLowerCase();
  const browser = browserName.trim().toLowerCase();

  const isGecko =
    engine.includes('gecko') ||
    includesAny(browser, ['firefox', 'fxios']) ||
    includesAny(ua, ['firefox', 'fxios']);

  if (isGecko) {
    return 'firefox';
  }

  const isChromium =
    engine.includes('blink') ||
    engine.includes('chromium') ||
    includesAny(browser, [
      'chrome',
      'chromium',
      'crios',
      'edg',
      'edge',
      'opera',
      'opr',
      'brave',
      'vivaldi',
      'zen',
    ]) ||
    includesAny(ua, [
      'chrome/',
      'crios/',
      'chromium',
      'edg/',
      'edgios/',
      'opr/',
      'opera',
    ]);

  if (isChromium) {
    return 'chrome';
  }

  const isSafari =
    engine.includes('webkit') ||
    includesAny(browser, ['safari', 'mobile safari']) ||
    (includesAny(ua, ['safari']) &&
      !includesAny(ua, ['chrome', 'chromium', 'crios', 'fxios']));

  if (isSafari) {
    return 'safari';
  }

  if (browser && browser !== 'unknown') {
    return 'other';
  }

  if (
    includesAny(ua, ['iphone', 'ipad', 'mac os']) &&
    !includesAny(ua, ['crios', 'fxios', 'chrome', 'chromium'])
  ) {
    return 'safari';
  }

  if (includesAny(ua, ['firefox', 'fxios'])) {
    return 'firefox';
  }

  if (
    includesAny(ua, ['chrome', 'crios', 'chromium', 'edg/', 'opr/', 'opera'])
  ) {
    return 'chrome';
  }

  return 'unknown';
}
