import type { BetterAuthPlugin } from 'better-auth';
import { HIDE_METADATA } from 'better-auth';
import { APIError, createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import * as z from 'zod';

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

/**
 * Hands a browser session to an Expo app via deep link query params.
 * RN cannot read Set-Cookie from fetch, so we pass the raw session token.
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

          const token = ctx.context.session.session.token;
          const expiresAt = new Date(
            ctx.context.session.session.expiresAt
          ).toISOString();
          const cookieName = ctx.context.authCookies.sessionToken.name;

          let location = appendQueryParam(callbackURL, 'token', token);
          location = appendQueryParam(location, 'expires_at', expiresAt);
          location = appendQueryParam(location, 'cookie_name', cookieName);

          throw ctx.redirect(location);
        }
      ),
    },
  };
}
