import type { BetterAuthPlugin } from 'better-auth';
import { HIDE_METADATA } from 'better-auth';
import { APIError, createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import * as z from 'zod';

function appendCookieToCallback(callbackURL: string, cookie: string): string {
  try {
    const url = new URL(callbackURL);
    url.searchParams.set('cookie', cookie);
    return url.toString();
  } catch {
    const separator = callbackURL.includes('?') ? '&' : '?';
    return `${callbackURL}${separator}cookie=${encodeURIComponent(cookie)}`;
  }
}

/**
 * Same handoff shape as @better-auth/expo OAuth callbacks:
 * redirect to the app deep link with `?cookie=<Set-Cookie header>`.
 */
export function expoMobileHandoff(): BetterAuthPlugin {
  return {
    id: 'expo-mobile-handoff',
    endpoints: {
      expoMobileCallback: createAuthEndpoint(
        '/expo-mobile-callback',
        {
          method: 'GET',
          query: z.object({
            callbackURL: z.string().min(1),
          }),
          use: [sessionMiddleware],
          metadata: HIDE_METADATA,
        },
        async (ctx) => {
          const { callbackURL } = ctx.query;

          if (!ctx.context.isTrustedOrigin(callbackURL)) {
            throw new APIError('BAD_REQUEST', {
              message: 'Invalid callbackURL',
            });
          }

          await setSessionCookie(ctx, {
            session: ctx.context.session.session,
            user: ctx.context.session.user,
          });

          const cookie =
            (
              ctx as typeof ctx & {
                responseHeaders?: Headers;
              }
            ).responseHeaders?.get('set-cookie') ??
            (
              ctx.context as typeof ctx.context & {
                responseHeaders?: Headers;
              }
            ).responseHeaders?.get('set-cookie');

          if (!cookie) {
            throw new APIError('INTERNAL_SERVER_ERROR', {
              message: 'Missing signed session cookie',
            });
          }

          throw ctx.redirect(appendCookieToCallback(callbackURL, cookie));
        }
      ),
    },
  };
}
