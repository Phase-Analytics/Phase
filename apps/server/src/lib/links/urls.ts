import { LINK_DEFAULT_HOST, LINK_SHORT_PATH_PREFIX } from './constants';

export function buildDefaultShortUrl(slug: string): string {
  return `https://${LINK_DEFAULT_HOST}${LINK_SHORT_PATH_PREFIX}/${slug}`;
}

export function buildCustomShortUrl(hostname: string, slug: string): string {
  return `https://${hostname}/${slug}`;
}

export function resolvePrimaryShortUrl(
  slug: string,
  domainIds: string[],
  domainsById: Map<string, { hostname: string; status: string }>
): string {
  if (domainIds.length === 1) {
    const domain = domainsById.get(domainIds[0]);
    if (domain?.status === 'verified') {
      return buildCustomShortUrl(domain.hostname, slug);
    }
  }

  return buildDefaultShortUrl(slug);
}
