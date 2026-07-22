export function isMobileAuthCallback(
  url: string | null | undefined
): url is string {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'phase:' || parsed.protocol === 'exp:';
  } catch {
    return false;
  }
}

export function getWebAuthOrigin(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL?.includes('localhost')
    ? 'http://localhost:3002'
    : 'https://phase.sh';
}

export function getSocialAuthCallbackURL(mobileCallback: string | null): string {
  const webUrl = getWebAuthOrigin();
  if (isMobileAuthCallback(mobileCallback)) {
    return `${webUrl}/auth?callbackURL=${encodeURIComponent(mobileCallback)}`;
  }
  return `${webUrl}/dashboard`;
}

export function handoffToMobileApp(callbackURL: string): void {
  const serverURL = (
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'
  ).replace(/\/$/, '');

  window.location.href = `${serverURL}/api/auth/expo-mobile-callback?callbackURL=${encodeURIComponent(callbackURL)}`;
}
