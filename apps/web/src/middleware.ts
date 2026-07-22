import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  DEFAULT_LINK_HOSTS,
  proxyCustomDomainLinkRedirect,
} from '@/lib/link-redirect-upstream';

const SKIP_PREFIXES = [
  '/_next',
  '/api',
  '/dashboard',
  '/docs',
  '/auth',
  '/billing',
  '/l/',
  '/p/',
];

const SINGLE_SLUG_PATH = /^\/([^/]+)\/?$/;

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();

  if (!host || DEFAULT_LINK_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (pathname.includes('.')) {
    return NextResponse.next();
  }

  const match = pathname.match(SINGLE_SLUG_PATH);
  if (!match) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return await proxyCustomDomainLinkRedirect(request, host, match[1]);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
