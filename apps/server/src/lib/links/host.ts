import { LINK_CNAME_TARGET, LINK_DEFAULT_HOST } from './constants';

const TRAILING_DOT_REGEX = /\.$/;

export function normalizeLinkHost(
  host: string | null | undefined
): string | null {
  if (!host?.trim()) {
    return null;
  }

  return host
    .trim()
    .toLowerCase()
    .replace(TRAILING_DOT_REGEX, '')
    .split(':')[0];
}

function isLinkIngressHostname(host: string): boolean {
  const normalized = normalizeLinkHost(host);
  if (!normalized) {
    return false;
  }

  return (
    normalized === LINK_CNAME_TARGET ||
    normalized === LINK_DEFAULT_HOST ||
    normalized === `www.${LINK_CNAME_TARGET}` ||
    normalized === `www.${LINK_DEFAULT_HOST}`
  );
}

export function resolveLinkRequestHost(headers: Headers): string | null {
  const host = normalizeLinkHost(headers.get('host'));
  const forwarded = normalizeLinkHost(
    headers.get('x-forwarded-host')?.split(',')[0]
  );

  if (forwarded && host && isLinkIngressHostname(host)) {
    return forwarded;
  }

  return forwarded ?? host;
}
