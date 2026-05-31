import { UAParser } from 'ua-parser-js';
import { getLocationFromIP } from '@/lib/geolocation';
import { shouldRecordLinkClick } from './bot';
import { getLinkClickBuffer } from './click-buffer';
import { LINK_DEFAULT_HOST } from './constants';
import {
  resolveDestinationForPlatform,
  resolveLinkDevicePlatform,
} from './device';
import { normalizeReferrer } from './referrer';
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
  const browserFamily = parser.getBrowser().name ?? 'unknown';

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

  const clientIp = extractClientIp(request);
  const geo = clientIp ? getLocationFromIP(clientIp) : null;

  const buffer = getLinkClickBuffer();
  if (buffer && shouldRecordLinkClick(request)) {
    await buffer.push({
      appId: link.appId,
      linkId: link.id,
      visitorKey: buildVisitorKey({
        linkId: link.id,
        platform,
        osFamily,
        browserFamily,
        acceptLanguage: request.headers.get('accept-language'),
      }),
      countryCode: geo?.countryCode ?? null,
      region: geo?.city ?? null,
      os: osFamily,
      browser: browserFamily,
      platform,
      referrer: normalizeReferrer(request.headers.get('referer')),
      domainHost,
      timestamp: new Date().toISOString(),
    });
  }

  return Response.redirect(finalUrl, 302);
}
