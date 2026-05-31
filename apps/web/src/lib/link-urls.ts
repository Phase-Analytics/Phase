const LINK_DEFAULT_HOST = 'phase.sh';
const HTTP_PREFIX_RE = /^https?:\/\//i;
const TRAILING_SLASH_RE = /\/$/;

export function buildDefaultShortUrl(slug: string): string {
  return `https://${LINK_DEFAULT_HOST}/l/${slug}`;
}

export function buildCustomShortUrl(hostname: string, slug: string): string {
  return `https://${hostname}/${slug}`;
}

export function formatUrlWithoutProtocol(url: string): string {
  return url.replace(HTTP_PREFIX_RE, '').replace(TRAILING_SLASH_RE, '');
}

export function getLinkDisplayName(
  name: string | null | undefined,
  shortUrlDisplay: string
): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }
  return shortUrlDisplay;
}

export function getPrimaryLinkUrl(
  slug: string,
  domainIds: string[],
  domains: Array<{ id: string; hostname: string; status: string }>
): { url: string; display: string } {
  if (domainIds.length === 1) {
    const domain = domains.find(
      (entry) => entry.id === domainIds[0] && entry.status === 'verified'
    );
    if (domain) {
      const url = buildCustomShortUrl(domain.hostname, slug);
      return {
        url,
        display: formatUrlWithoutProtocol(url),
      };
    }
  }

  const url = buildDefaultShortUrl(slug);
  return {
    url,
    display: formatUrlWithoutProtocol(url),
  };
}

export function getLinkStatus(link: {
  disabledAt: string | null;
  expiresAt: string | null;
}): 'active' | 'disabled' | 'expired' {
  if (link.disabledAt) {
    return 'disabled';
  }

  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
    return 'expired';
  }

  return 'active';
}
