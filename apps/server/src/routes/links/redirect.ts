import { Elysia, t } from 'elysia';
import { LINK_DEFAULT_HOST } from '@/lib/links/constants';
import { handleLinkRedirect } from '@/lib/links/redirect';

function normalizeHost(host: string | null): string | null {
  return host?.split(':')[0]?.toLowerCase() ?? null;
}

export const linkRedirectRouter = new Elysia()
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
      const host = normalizeHost(request.headers.get('host'));
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
