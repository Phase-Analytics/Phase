export function getLinkOgImageSrc(
  url: string | null | undefined,
  cacheKey?: string | number | null
): string | undefined {
  if (!url?.trim()) {
    return;
  }

  if (url.includes('?v=')) {
    return url;
  }

  const base = url.split('?')[0] ?? url;
  if (cacheKey == null || cacheKey === '') {
    return base;
  }

  return `${base}?v=${encodeURIComponent(String(cacheKey))}`;
}
