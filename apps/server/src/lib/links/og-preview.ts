import type { CachedLinkConfig } from './cache';
import { LINK_DEFAULT_HOST } from './constants';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function resolveOgTitle(link: CachedLinkConfig): string {
  if (link.ogTitle?.trim()) {
    return link.ogTitle.trim();
  }

  try {
    return new URL(link.destinationUrl).hostname;
  } catch {
    return link.slug;
  }
}

function resolveOgDescription(link: CachedLinkConfig): string | null {
  const description = link.ogDescription?.trim();
  return description || null;
}

export function buildLinkOgPreviewHtml(params: {
  link: CachedLinkConfig;
  pageUrl: string;
  destinationUrl: string;
}): string {
  const { link, pageUrl, destinationUrl } = params;
  const title = escapeHtml(resolveOgTitle(link));
  const description = resolveOgDescription(link);
  const imageUrl = link.ogImageUrl?.trim() || null;

  const metaTags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:title" content="${title}" />`,
    description
      ? `<meta property="og:description" content="${escapeHtml(description)}" />`
      : '',
    imageUrl
      ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`
      : '',
    imageUrl ? `<meta property="og:image:width" content="1200" />` : '',
    imageUrl ? `<meta property="og:image:height" content="630" />` : '',
    `<meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    description
      ? `<meta name="twitter:description" content="${escapeHtml(description)}" />`
      : '',
    imageUrl
      ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`
      : '',
    `<link rel="canonical" href="${escapeHtml(destinationUrl)}" />`,
  ]
    .filter(Boolean)
    .join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${metaTags}
  </head>
  <body></body>
</html>`;
}

export function buildLinkPreviewPageUrl(
  slug: string,
  options: { mode: 'default' | 'custom'; host?: string }
): string {
  if (options.mode === 'custom' && options.host) {
    return `https://${options.host.split(':')[0]?.toLowerCase()}/${slug}`;
  }

  return `https://${LINK_DEFAULT_HOST}/l/${slug}`;
}
