import { classifyLinkRequest } from './bot';
import { LINK_DEFAULT_HOST } from './constants';
import { parseLinkUserAgent, resolveDestinationForPlatform } from './device';
import { buildLinkOgPreviewHtml, buildLinkPreviewPageUrl } from './og-preview';
import { recordLinkClick } from './record-click';
import { resolveLinkReferrer } from './referrer';
import {
  isLinkUnavailable,
  resolveLinkBySlug,
  resolveVerifiedDomain,
} from './resolve';
import { mergeUtmIntoUrl } from './utm';
import { resolveVisitorIdentity } from './visitor';

export type LinkRedirectTarget =
  | { mode: 'default' }
  | { mode: 'custom'; host: string };

function errorResponse(status: 404 | 410, reason: string): Response {
  return new Response(status === 410 ? 'Gone' : 'Not Found', {
    status,
    headers: { 'X-Phase-Link-Error': reason },
  });
}

/**
 * Hot path: on a warm cache this performs no awaited network I/O. Click
 * recording (rate limit, Redis buffer, SSE) runs after the response.
 */
export async function handleLinkRedirect(
  request: Request,
  slug: string,
  target: LinkRedirectTarget,
  clientIp: string | null
): Promise<Response> {
  let domainHost = LINK_DEFAULT_HOST;
  let domainId: string | null = null;

  if (target.mode === 'custom') {
    const domain = await resolveVerifiedDomain(target.host);
    if (!domain) {
      return errorResponse(404, 'domain_not_verified');
    }
    domainHost = domain.hostname;
    domainId = domain.id;
  }

  const link = await resolveLinkBySlug(slug, domainId);
  if (!link) {
    return errorResponse(404, 'link_not_found');
  }
  if (link.banned) {
    return errorResponse(410, 'link_banned');
  }
  if (isLinkUnavailable(link)) {
    return errorResponse(404, 'link_unavailable');
  }

  const rawUserAgent = request.headers.get('user-agent');
  const kind = classifyLinkRequest(request, rawUserAgent);
  const userAgent = parseLinkUserAgent(rawUserAgent);

  const finalUrl = mergeUtmIntoUrl(
    resolveDestinationForPlatform(userAgent.platform, link),
    link
  );

  if (kind === 'preview') {
    const html = buildLinkOgPreviewHtml({
      link,
      pageUrl: buildLinkPreviewPageUrl(slug, target),
      destinationUrl: finalUrl,
    });
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  const headers = new Headers({ Location: finalUrl });

  if (kind === 'human') {
    const { visitorKey, setCookie } = resolveVisitorIdentity({
      cookieHeader: request.headers.get('cookie'),
      ip: clientIp,
      userAgent: rawUserAgent,
    });
    if (setCookie) {
      headers.append('Set-Cookie', setCookie);
    }

    recordLinkClick({
      link,
      clientIp,
      userAgent,
      visitorKey,
      referrer: resolveLinkReferrer({
        refererHeader: request.headers.get('referer'),
        requestUrl: request.url,
        secFetchSite: request.headers.get('sec-fetch-site'),
        userAgent: rawUserAgent,
      }),
      domainHost,
    }).catch((error) => {
      console.error('[Links] Failed to record click:', error);
    });
  }

  // Never cached: edits must apply immediately and every click must reach us.
  headers.set('Cache-Control', 'private, no-store');
  return new Response(null, { status: 302, headers });
}
