const LINK_DEFAULT_HOST = 'phase.sh';

export function buildDefaultShortUrl(slug: string): string {
  return `https://${LINK_DEFAULT_HOST}/l/${slug}`;
}

export function buildCustomShortUrl(hostname: string, slug: string): string {
  return `https://${hostname}/${slug}`;
}

export function getLinkShortUrls(
  slug: string,
  domains: Array<{ id: string; hostname: string; status: string }>,
  boundDomainIds: string[]
): Array<{ label: string; url: string }> {
  const urls: Array<{ label: string; url: string }> = [
    { label: 'Default', url: buildDefaultShortUrl(slug) },
  ];

  const boundSet = new Set(boundDomainIds);
  const hasBindings = boundDomainIds.length > 0;

  for (const domain of domains) {
    if (domain.status !== 'verified') {
      continue;
    }
    if (hasBindings && !boundSet.has(domain.id)) {
      continue;
    }
    urls.push({
      label: domain.hostname,
      url: buildCustomShortUrl(domain.hostname, slug),
    });
  }

  return urls;
}
