import { ErrorCode, HttpStatus } from '@phase/shared';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { Elysia as ElysiaClass } from 'elysia';
import { apps, db, publicApiTokens } from '@/db';
import { hashPublicApiToken } from '@/lib/keys';

class PublicApiAuthError extends Error {
  statusCode: number;
  errorCode: string;
  detail: string;

  constructor(statusCode: number, errorCode: string, detail: string) {
    super(detail);
    this.name = 'PublicApiAuthError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.detail = detail;
  }
}

export const publicApiAuthPlugin = new ElysiaClass({ name: 'publicApiAuth' })
  .state({
    publicApiApp: null as typeof apps.$inferSelect | null,
    publicApiToken: null as typeof publicApiTokens.$inferSelect | null,
  })
  .error({ PUBLIC_API_AUTH_ERROR: PublicApiAuthError })
  .onError(({ error, set }) => {
    if (error instanceof PublicApiAuthError) {
      set.status = error.statusCode;
      return {
        code: error.errorCode,
        detail: error.detail,
      };
    }
  })
  .resolve(async ({ request, params, store }) => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new PublicApiAuthError(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Authorization header is required. Use: Authorization: Bearer <public_api_token>'
      );
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new PublicApiAuthError(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Invalid authorization format. Use: Bearer <public_api_token>'
      );
    }

    const tokenHash = hashPublicApiToken(token);
    const appId = (params as { appId?: string } | undefined)?.appId;

    if (!appId) {
      throw new PublicApiAuthError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'appId is required'
      );
    }

    const [result] = await db
      .select({
        token: publicApiTokens,
        app: apps,
      })
      .from(publicApiTokens)
      .innerJoin(apps, eq(publicApiTokens.appId, apps.id))
      .where(
        and(
          eq(publicApiTokens.tokenHash, tokenHash),
          eq(publicApiTokens.appId, appId),
          isNull(publicApiTokens.revokedAt),
          or(
            isNull(publicApiTokens.expiresAt),
            sql`${publicApiTokens.expiresAt} > NOW()`
          )
        )
      )
      .limit(1);

    if (!result) {
      throw new PublicApiAuthError(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Invalid, expired, revoked, or unauthorized public API token'
      );
    }

    store.publicApiApp = result.app;
    store.publicApiToken = result.token;

    try {
      await db
        .update(publicApiTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(publicApiTokens.id, result.token.id));
    } catch (error) {
      console.error('[Public API Auth] Failed to update lastUsedAt:', error);
    }

    return {
      publicApiApp: result.app,
      publicApiToken: result.token,
    };
  })
  .as('scoped');
