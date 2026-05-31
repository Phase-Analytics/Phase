export function getLinkRedirectUpstreamUrl(): string {
  if (process.env.LINK_REDIRECT_UPSTREAM_URL) {
    return process.env.LINK_REDIRECT_UPSTREAM_URL;
  }

  if (process.env.SERVER_INTERNAL_URL) {
    return process.env.SERVER_INTERNAL_URL;
  }

  return 'http://127.0.0.1:3001';
}

export const DEFAULT_LINK_HOSTS = new Set([
  'phase.sh',
  'www.phase.sh',
  'localhost',
]);

export function buildLinkRedirectProxyHeaders(
  request: Request,
  host: string
): HeadersInit {
  return {
    accept: request.headers.get('accept') ?? '*/*',
    'accept-language': request.headers.get('accept-language') ?? '',
    host,
    referer: request.headers.get('referer') ?? '',
    'user-agent': request.headers.get('user-agent') ?? 'Phase-Link-Proxy/1',
    'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
    'cf-connecting-ip': request.headers.get('cf-connecting-ip') ?? '',
    'sec-ch-ua': request.headers.get('sec-ch-ua') ?? '',
    'sec-purpose': request.headers.get('sec-purpose') ?? '',
    purpose: request.headers.get('purpose') ?? '',
  };
}

export async function proxyCustomDomainLinkRedirect(
  request: Request,
  host: string,
  slug: string
): Promise<Response> {
  const upstream = await fetch(
    `${getLinkRedirectUpstreamUrl()}/${encodeURIComponent(slug)}`,
    {
      method: 'GET',
      redirect: 'manual',
      headers: buildLinkRedirectProxyHeaders(request, host),
    }
  );

  if (upstream.status === 302) {
    const location = upstream.headers.get('location');
    if (location) {
      return Response.redirect(location, 302);
    }
  }

  const body = await upstream.text();
  const headers = new Headers();
  const linkError = upstream.headers.get('X-Phase-Link-Error');
  if (linkError) {
    headers.set('X-Phase-Link-Error', linkError);
  }

  return new Response(body, {
    status: upstream.ok || upstream.status === 404 ? upstream.status : 502,
    headers,
  });
}
