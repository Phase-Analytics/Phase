import { createHash, randomUUID } from 'node:crypto';
import { normalizeLinkBrowserFamily } from '@phase/shared';
import { UAParser } from 'ua-parser-js';
import { getLocationFromIP } from '@/lib/geolocation';
import { sseManager } from '@/lib/sse-manager';
import { shouldRecordLinkClick, shouldServeLinkOgPreview } from './bot';
import { getLinkClickBuffer } from './click-buffer';
import { LINK_DEFAULT_HOST } from './constants';
import {
  resolveDestinationForPlatform,
  resolveLinkDevicePlatform,
} from './device';
import { buildLinkOgPreviewHtml, buildLinkPreviewPageUrl } from './og-preview';
import { resolveLinkReferrer } from './referrer';
import {
  isLinkAllowedOnDomain,
  isLinkUnavailable,
  resolveLinkBySlug,
  resolveVerifiedDomain,
} from './resolve';
import { mergeUtmIntoUrl } from './utm';
import { buildVisitorKey } from './visitor';

function extractClientIp(request: Request): string | null {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  return (
    cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || realIp || null
  );
}

function notFound(reason: string): Response {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'X-Phase-Link-Error': reason,
    },
  });
}

export async function handleLinkRedirect(
  request: Request,
  slug: string,
  options: { mode: 'default' | 'custom'; host?: string }
): Promise<Response> {
  const link = await resolveLinkBySlug(slug);
  if (!link) {
    return notFound('link_not_found');
  }

  if (isLinkUnavailable(link)) {
    return notFound('link_unavailable');
  }

  let domainHost = LINK_DEFAULT_HOST;

  if (options.mode === 'custom') {
    const host = options.host?.split(':')[0]?.toLowerCase();
    if (!host) {
      return notFound('missing_host');
    }

    const domain = await resolveVerifiedDomain(host);
    if (!domain) {
      return notFound('domain_not_verified');
    }

    if (!isLinkAllowedOnDomain(link, domain)) {
      return notFound('domain_not_allowed');
    }

    domainHost = domain.hostname;
  }

  const userAgent = request.headers.get('user-agent');
  const platform = resolveLinkDevicePlatform(userAgent);
  const parser = new UAParser(userAgent ?? undefined);
  const osFamily = parser.getOS().name ?? 'unknown';
  const browserFamily = normalizeLinkBrowserFamily(
    parser.getBrowser().name ?? 'unknown',
    userAgent,
    parser.getEngine().name ?? undefined
  );

  const destination = resolveDestinationForPlatform(platform, {
    destinationUrl: link.destinationUrl,
    deviceIosUrl: link.deviceIosUrl,
    deviceAndroidUrl: link.deviceAndroidUrl,
    deviceOthersUrl: link.deviceOthersUrl,
  });

  const finalUrl = mergeUtmIntoUrl(destination, {
    utmSource: link.utmSource,
    utmMedium: link.utmMedium,
    utmCampaign: link.utmCampaign,
    utmTerm: link.utmTerm,
    utmContent: link.utmContent,
  });

  if (shouldServeLinkOgPreview(request)) {
    const pageUrl = buildLinkPreviewPageUrl(slug, options);
    const html = buildLinkOgPreviewHtml({
      link,
      pageUrl,
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

  const clientIp = extractClientIp(request);
  const geo = clientIp ? getLocationFromIP(clientIp) : null;
  const ipHash = clientIp
    ? createHash('sha256').update(clientIp).digest('hex').slice(0, 16)
    : null;

  const buffer = getLinkClickBuffer();
  if (buffer && shouldRecordLinkClick(request)) {
    const clickId = randomUUID();
    const timestamp = new Date().toISOString();
    const countryCode = geo?.countryCode ?? null;

    await buffer.push({
      appId: link.appId,
      linkId: link.id,
      visitorKey: buildVisitorKey({
        linkId: link.id,
        platform,
        osFamily,
        browserFamily,
        acceptLanguage: request.headers.get('accept-language'),
        ipHash,
      }),
      countryCode,
      os: osFamily,
      browser: browserFamily,
      platform,
      referrer: resolveLinkReferrer({
        refererHeader: request.headers.get('referer'),
        requestUrl: request.url,
        secFetchSite: request.headers.get('sec-fetch-site'),
      }),
      domainHost,
      timestamp,
    });

    const linkName = link.name?.trim() || link.slug;

    sseManager.pushLinkClick(link.appId, {
      clickId,
      linkId: link.id,
      linkName,
      timestamp,
      countryCode,
      os: osFamily,
      browser: browserFamily,
    });
  }

  return Response.redirect(finalUrl, 302);
}
