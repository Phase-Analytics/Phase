import type { BetterAuthPlugin } from 'better-auth';
import { HIDE_METADATA } from 'better-auth';
import { APIError, createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import * as z from 'zod';

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

/**
 * Hands a browser session to an Expo app via deep link `cookie` query param,
 * matching the @better-auth/expo OAuth callback pattern (RN cannot read Set-Cookie).
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

          const { name, attributes } = ctx.context.authCookies.sessionToken;
          const token = ctx.context.session.session.token;
          const maxAge =
            attributes.maxAge ??
            Math.max(
              0,
              Math.floor(
                (new Date(ctx.context.session.session.expiresAt).getTime() -
                  Date.now()) /
                  1000
              )
            );

          const cookie = [
            `${name}=${token}`,
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

          throw ctx.redirect(appendQueryParam(callbackURL, 'cookie', cookie));
        }
      ),
    },
  };
}
