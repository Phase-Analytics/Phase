import { LINK_DEFAULT_HOST, LINK_SHORT_PATH_PREFIX } from './constants';

export function buildDefaultShortUrl(slug: string): string {
  return `https://${LINK_DEFAULT_HOST}${LINK_SHORT_PATH_PREFIX}/${slug}`;
}

export function buildCustomShortUrl(hostname: string, slug: string): string {
  return `https://${hostname}/${slug}`;
}

export function resolvePrimaryShortUrl(
  slug: string,
  domainId: string | null,
  domainsById: Map<string, { hostname: string; status: string }>
): string {
  if (domainId) {
    const domain = domainsById.get(domainId);
    if (domain) {
      return buildCustomShortUrl(domain.hostname, slug);
    }
  }

  return buildDefaultShortUrl(slug);
}
