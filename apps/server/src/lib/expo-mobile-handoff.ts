import type { BetterAuthPlugin } from 'better-auth';
import { HIDE_METADATA } from 'better-auth';
import { APIError, createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { generateRandomString } from 'better-auth/crypto';
import * as z from 'zod';

const HANDOFF_PREFIX = 'expo-mobile-handoff:';

const handoffSessionSchema = z.object({
  session: z
    .object({
      id: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      userId: z.string(),
      expiresAt: z.coerce.date(),
      token: z.string(),
      ipAddress: z.string().nullable().optional(),
      userAgent: z.string().nullable().optional(),
    })
    .passthrough(),
  user: z
    .object({
      id: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      email: z.string(),
      emailVerified: z.boolean(),
      name: z.string(),
      image: z.string().nullable().optional(),
    })
    .passthrough(),
});

function appendCodeToCallback(callbackURL: string, code: string): string {
  try {
    const url = new URL(callbackURL);
    url.searchParams.set('code', code);
    return url.toString();
  } catch {
    const separator = callbackURL.includes('?') ? '&' : '?';
    return `${callbackURL}${separator}code=${encodeURIComponent(code)}`;
  }
}

/**
 * Exchanges a short-lived, single-use browser handoff code for a signed
 * Better Auth cookie and session payload.
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

          const code = generateRandomString(32);
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `${HANDOFF_PREFIX}${code}`,
            value: JSON.stringify(ctx.context.session),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000),
          });

          throw ctx.redirect(appendCodeToCallback(callbackURL, code));
        }
      ),
      expoMobileExchange: createAuthEndpoint(
        '/expo-mobile-exchange',
        {
          method: 'POST',
          body: z.object({
            code: z.string().min(1),
          }),
          metadata: HIDE_METADATA,
        },
        async (ctx) => {
          const verification =
            await ctx.context.internalAdapter.consumeVerificationValue(
              `${HANDOFF_PREFIX}${ctx.body.code}`
            );
          if (!verification || verification.expiresAt < new Date()) {
            throw new APIError('BAD_REQUEST', {
              message: 'Invalid or expired handoff code',
            });
          }

          let session: z.infer<typeof handoffSessionSchema>;
          try {
            session = handoffSessionSchema.parse(
              JSON.parse(verification.value) as unknown
            );
          } catch {
            throw new APIError('BAD_REQUEST', {
              message: 'Invalid handoff session',
            });
          }

          if (session.session.expiresAt < new Date()) {
            throw new APIError('BAD_REQUEST', {
              message: 'Session expired',
            });
          }

          await setSessionCookie(ctx, session);

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

          return ctx.json({
            cookie,
            session,
          });
        }
      ),
    },
  };
}
