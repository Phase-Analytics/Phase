import { isbot } from 'isbot';

// Link-unfurl crawlers only. Search engines and in-app browsers (e.g. the
// Pinterest or LinkedIn apps) must not match: they get a plain redirect.
const SOCIAL_PREVIEW_UA =
  /^whatsapp\/|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterestbot|redditbot|skypeuripreview|snap url preview|embedly|iframely|vkshare|mastodon|bluesky cardyb/i;

/**
 * - `preview`: known social/link-unfurl crawler; gets OG preview HTML.
 * - `automated`: other bots, prefetches, non-GET, missing UA; redirected but
 *   never recorded as a click.
 * - `human`: redirected and recorded.
 */
export type LinkRequestKind = 'preview' | 'automated' | 'human';

function isPrefetchRequest(headers: Headers): boolean {
  const secPurpose = headers.get('sec-purpose')?.toLowerCase() ?? '';
  const purpose = headers.get('purpose')?.toLowerCase() ?? '';
  const secFetchMode = headers.get('sec-fetch-mode')?.toLowerCase() ?? '';
  const moz = headers.get('x-moz')?.toLowerCase() ?? '';

  return (
    secPurpose.includes('prefetch') ||
    secPurpose.includes('prerender') ||
    purpose.includes('prefetch') ||
    purpose.includes('prerender') ||
    secFetchMode === 'prefetch' ||
    moz.includes('prefetch')
  );
}

export function classifyLinkRequest(
  request: Request,
  userAgent: string | null
): LinkRequestKind {
  if (request.method.toUpperCase() !== 'GET') {
    return 'automated';
  }

  if (isPrefetchRequest(request.headers)) {
    return 'automated';
  }

  if (!userAgent?.trim()) {
    return 'automated';
  }

  if (SOCIAL_PREVIEW_UA.test(userAgent)) {
    return 'preview';
  }

  return isbot(userAgent) ? 'automated' : 'human';
}
