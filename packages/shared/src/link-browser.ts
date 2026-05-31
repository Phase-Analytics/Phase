export function normalizeLinkBrowserFamily(
  browserName: string,
  userAgent?: string | null
): string {
  const name = browserName.trim().toLowerCase();
  const ua = (userAgent ?? '').toLowerCase();

  if (name && name !== 'unknown') {
    if (name.includes('fxios') || name.includes('firefox')) {
      return 'firefox';
    }
    if (name.includes('crios')) {
      return 'chrome';
    }
    if (
      (name.includes('chrome') || name.includes('chromium')) &&
      !name.includes('safari')
    ) {
      return 'chrome';
    }
    if (
      name.includes('safari') ||
      name.includes('webkit') ||
      name.includes('mobile safari')
    ) {
      return 'safari';
    }
    if (
      name.includes('edg') ||
      name.includes('opera') ||
      name.includes('opr')
    ) {
      return 'other';
    }
    return 'other';
  }

  if (
    ua.includes('safari') &&
    !ua.includes('chrome') &&
    !ua.includes('crios') &&
    !ua.includes('fxios') &&
    !ua.includes('chromium')
  ) {
    return 'safari';
  }

  if (
    (ua.includes('iphone') || ua.includes('ipad') || ua.includes('mac os')) &&
    !ua.includes('crios') &&
    !ua.includes('fxios') &&
    !ua.includes('chrome')
  ) {
    return 'safari';
  }

  if (ua.includes('firefox') || ua.includes('fxios')) {
    return 'firefox';
  }

  if (ua.includes('edg/')) {
    return 'other';
  }

  if (
    ua.includes('chrome') ||
    ua.includes('crios') ||
    ua.includes('chromium')
  ) {
    return 'chrome';
  }

  return 'unknown';
}
