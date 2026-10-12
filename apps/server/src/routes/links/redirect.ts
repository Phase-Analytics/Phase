import { Elysia, t } from 'elysia';
import { getClientIp, getSocketAddress } from '@/lib/client-ip';
import { isDefaultLinkHost, resolveLinkRequestHost } from '@/lib/links/host';
import { handleLinkRedirect } from '@/lib/links/redirect';

function notFound(): Response {
  return new Response('Not Found', { status: 404 });
}

/**
 * Link redirects are never rate limited: people behind one IP (venue Wi-Fi,
 * QR codes) must always reach the destination. The per-IP limit only stops
 * click recording (see recordLinkClick).
 */
export const linkRedirectRouter = new Elysia()
  .get(
    '/l/:slug',
    ({ request, params, server }) => {
      // Default-domain links only exist on the default host. Without this
      // check every customer domain would also serve them (brand phishing).
      if (!isDefaultLinkHost(resolveLinkRequestHost(request.headers))) {
        return notFound();
      }

      return handleLinkRedirect(
        request,
        params.slug,
        { mode: 'default' },
        getClientIp(request, getSocketAddress(request, server))
      );
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
    }
  )
  .get(
    '/:slug',
    ({ request, params, server }) => {
      const host = resolveLinkRequestHost(request.headers);
      if (!host || isDefaultLinkHost(host) || host === 'localhost') {
        return notFound();
      }

      return handleLinkRedirect(
        request,
        params.slug,
        { mode: 'custom', host },
        getClientIp(request, getSocketAddress(request, server))
      );
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
    }
  );
