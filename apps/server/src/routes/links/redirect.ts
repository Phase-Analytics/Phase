import { ErrorCode, HttpStatus } from '@phase/shared';
import { Elysia, t } from 'elysia';
import { LINK_DEFAULT_HOST } from '@/lib/links/constants';
import { resolveLinkRequestHost } from '@/lib/links/host';
import { handleLinkRedirect } from '@/lib/links/redirect';
import {
  checkLinkRedirectRateLimit,
  RATE_LIMIT_STRATEGIES,
} from '@/lib/rate-limit';

function extractRedirectClientIp(request: Request): string | null {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

export const linkRedirectRouter = new Elysia()
  .onBeforeHandle(async ({ request, set }) => {
    const ip = extractRedirectClientIp(request);
    if (!ip) {
      return;
    }

    const rateLimitResult = await checkLinkRedirectRateLimit(ip);
    if (!rateLimitResult.allowed) {
      set.status = HttpStatus.TOO_MANY_REQUESTS;
      if (rateLimitResult.resetAt) {
        set.headers['Retry-After'] = String(
          Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
        );
      }
      set.headers['X-RateLimit-Limit'] = String(
        RATE_LIMIT_STRATEGIES.LINK_REDIRECT.maxAttempts
      );
      set.headers['X-RateLimit-Remaining'] = String(
        rateLimitResult.remaining ?? 0
      );
      return {
        code: ErrorCode.TOO_MANY_REQUESTS,
        detail: rateLimitResult.reason || 'Too many requests',
      };
    }
  })
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
