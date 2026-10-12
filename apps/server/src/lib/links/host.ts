import { LINK_DEFAULT_HOST } from './constants';

const TRAILING_DOT_REGEX = /\.$/;
const DEV_DEFAULT_HOSTS = new Set(['localhost', '127.0.0.1']);

export function normalizeLinkHost(
  host: string | null | undefined
): string | null {
  if (!host?.trim()) {
    return null;
  }

  return (
    host
      .trim()
      .toLowerCase()
      .replace(TRAILING_DOT_REGEX, '')
      .split(':')[0] || null
  );
}

/**
 * Host wins: Cloudflare for SaaS delivers the customer hostname in Host and
 * Traefik forwards it with passHostHeader, while X-Forwarded-Host can be
 * supplied by the client. X-Forwarded-Host is only a fallback for requests
 * that arrive without a Host header.
 */
export function resolveLinkRequestHost(headers: Headers): string | null {
  return (
    normalizeLinkHost(headers.get('host')) ??
    normalizeLinkHost(headers.get('x-forwarded-host')?.split(',')[0])
  );
}

/** Hosts that serve default-domain links under /l/:slug. */
export function isDefaultLinkHost(host: string | null): boolean {
  if (!host) {
    return false;
  }
  if (host === LINK_DEFAULT_HOST || host === `www.${LINK_DEFAULT_HOST}`) {
    return true;
  }
  return process.env.NODE_ENV !== 'production' && DEV_DEFAULT_HOSTS.has(host);
}
