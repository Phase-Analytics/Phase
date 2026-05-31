import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

const DEFAULT_LINK_HOSTS = new Set(['phase.sh', 'www.phase.sh', 'localhost']);

function buildProxyHeaders(request: NextRequest, host: string): HeadersInit {
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();

  if (!host || DEFAULT_LINK_HOSTS.has(host)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const { slug } = await context.params;
  const upstream = await fetch(`${API_URL}/${encodeURIComponent(slug)}`, {
    method: 'GET',
    redirect: 'manual',
    headers: buildProxyHeaders(request, host),
  });

  if (upstream.status === 302) {
    const location = upstream.headers.get('location');
    if (location) {
      return NextResponse.redirect(location, 302);
    }
  }

  const body = await upstream.text();

  return new NextResponse(body, {
    status: upstream.status === 404 ? 404 : 502,
    headers: {
      'X-Phase-Link-Error': upstream.headers.get('X-Phase-Link-Error') ?? '',
    },
  });
}
