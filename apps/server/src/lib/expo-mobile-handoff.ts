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

          const responseHeaders = (
            ctx.context as { responseHeaders?: Headers }
          ).responseHeaders;
          let cookie = responseHeaders?.get('set-cookie') ?? null;

          // Fallback if responseHeaders isn't populated yet — match oauth format.
          if (!cookie) {
            const { name, attributes } = ctx.context.authCookies.sessionToken;
            const maxAge =
              attributes.maxAge ??
              Math.max(
                60,
                Math.floor(
                  (new Date(ctx.context.session.session.expiresAt).getTime() -
                    Date.now()) /
                    1000
                )
              );
            cookie = [
              `${name}=${ctx.context.session.session.token}`,
              'Path=/',
              `Max-Age=${maxAge}`,
              attributes.httpOnly ? 'HttpOnly' : null,
              attributes.secure ? 'Secure' : null,
              attributes.sameSite
                ? `SameSite=${String(attributes.sameSite)}`
                : null,
            ]
              .filter(Boolean)
              .join('; ');
          }

          throw ctx.redirect(appendCookieToCallback(callbackURL, cookie));
        }
      ),
    },
  };
}
