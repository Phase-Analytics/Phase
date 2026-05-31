import { Elysia, t } from 'elysia';
import { LINK_DEFAULT_HOST } from '@/lib/links/constants';
import { DOMAIN_VERIFY_PATH, handleDomainVerifyRequest } from '@/lib/links/dns';
import { resolveLinkRequestHost } from '@/lib/links/host';
import { handleLinkRedirect } from '@/lib/links/redirect';

export const linkRedirectRouter = new Elysia()
  .get(DOMAIN_VERIFY_PATH, ({ request }) =>
    handleDomainVerifyRequest(resolveLinkRequestHost(request.headers))
  )
  .get(
    '/l/:slug',
    ({ request, params }) =>
      handleLinkRedirect(request, params.slug, { mode: 'default' }),
    {
      params: t.Object({
        slug: t.String(),
      }),
    }
  )
  .get(
    '/:slug',
    ({ request, params }) => {
      const host = resolveLinkRequestHost(request.headers);
      if (!host || host === LINK_DEFAULT_HOST || host === 'localhost') {
        return new Response('Not Found', { status: 404 });
      }

      return handleLinkRedirect(request, params.slug, {
        mode: 'custom',
        host,
      });
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
    }
  );
