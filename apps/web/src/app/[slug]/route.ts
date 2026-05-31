import type { NextRequest } from 'next/server';
import {
  DEFAULT_LINK_HOSTS,
  proxyCustomDomainLinkRedirect,
} from '@/lib/link-redirect-upstream';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();

  if (!host || DEFAULT_LINK_HOSTS.has(host)) {
    return new Response('Not Found', { status: 404 });
  }

  const { slug } = await context.params;
  return proxyCustomDomainLinkRedirect(request, host, slug);
}
