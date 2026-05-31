import type { NextRequest } from 'next/server';
import {
  buildLinkRedirectProxyHeaders,
  getLinkRedirectUpstreamUrl,
} from '@/lib/link-redirect-upstream';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? '';

  const upstream = await fetch(
    `${getLinkRedirectUpstreamUrl()}/l/${encodeURIComponent(slug)}`,
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

  return new Response(await upstream.text(), {
    status: upstream.status === 404 ? 404 : 502,
  });
}
