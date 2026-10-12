import { ErrorCode, HttpStatus } from '@phase/shared';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
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

const LAST_USED_AT_REFRESH_MS = 5 * 60 * 1000;

async function touchLastUsedAt(
  token: typeof publicApiTokens.$inferSelect
): Promise<void> {
  if (
    token.lastUsedAt &&
    Date.now() - token.lastUsedAt.getTime() < LAST_USED_AT_REFRESH_MS
  ) {
    return;
  }

  const now = new Date();
  const staleBefore = new Date(now.getTime() - LAST_USED_AT_REFRESH_MS);

  try {
    await db
      .update(publicApiTokens)
      .set({ lastUsedAt: now })
      .where(
        and(
          eq(publicApiTokens.id, token.id),
          or(
            isNull(publicApiTokens.lastUsedAt),
            lt(publicApiTokens.lastUsedAt, staleBefore)
          )
        )
      );
  } catch (error) {
    console.error('[API Auth] Failed to update lastUsedAt:', error);
  }
}

export const publicApiAuthPlugin = new ElysiaClass({ name: 'publicApiAuth' })
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
  .resolve(async ({ request, params }) => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new PublicApiAuthError(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Authorization header is required. Use: Authorization: Bearer <api_key>'
      );
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new PublicApiAuthError(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Invalid authorization format. Use: Bearer <api_key>'
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
        'Invalid, expired, revoked, or unauthorized API key'
      );
    }

    await touchLastUsedAt(result.token);

    return {
      publicApiApp: result.app,
      publicApiToken: result.token,
    };
  })
  .as('scoped');
