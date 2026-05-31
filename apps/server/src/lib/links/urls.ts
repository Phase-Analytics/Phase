import { LINK_DEFAULT_HOST, LINK_SHORT_PATH_PREFIX } from './constants';

export function buildDefaultShortUrl(slug: string): string {
  return `https://${LINK_DEFAULT_HOST}${LINK_SHORT_PATH_PREFIX}/${slug}`;
}

export function buildCustomShortUrl(hostname: string, slug: string): string {
  return `https://${hostname}/${slug}`;
}
