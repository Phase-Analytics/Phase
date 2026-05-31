import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const upstream = await fetch(`${API_URL}/l/${encodeURIComponent(slug)}`, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      'user-agent': request.headers.get('user-agent') ?? '',
      'accept-language': request.headers.get('accept-language') ?? '',
      referer: request.headers.get('referer') ?? '',
      host: request.headers.get('host') ?? '',
      'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
      'sec-ch-ua': request.headers.get('sec-ch-ua') ?? '',
      'sec-purpose': request.headers.get('sec-purpose') ?? '',
      purpose: request.headers.get('purpose') ?? '',
    },
  });

  if (upstream.status === 302) {
    const location = upstream.headers.get('location');
    if (location) {
      return NextResponse.redirect(location, 302);
    }
  }

  return new NextResponse('Not Found', {
    status: upstream.status === 404 ? 404 : 502,
  });
}
