import { authClient } from '@/lib/auth';

export function isMobileAuthCallback(url: string | null | undefined): url is string {
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

export async function handoffToMobileApp(callbackURL: string): Promise<void> {
  const { data, error } = await authClient.oneTimeToken.generate();
  if (error || !data?.token) {
    throw new Error(error?.message || 'Failed to open the Phase app');
  }

  const target = new URL(callbackURL);
  target.searchParams.set('ott', data.token);
  window.location.href = target.toString();
}
