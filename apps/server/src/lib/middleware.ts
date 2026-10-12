import { ErrorCode, HttpStatus } from '@phase/shared';
import { and, eq } from 'drizzle-orm';
import { Elysia as ElysiaClass } from 'elysia';
import { apps as appsTable, db } from '@/db';
import { findAccessibleApp } from '@/lib/app-access';
import { auth } from '@/lib/auth';
import { getAppByKey } from '@/lib/ingest-cache';

export type BetterAuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null;

export type BetterAuthSession = {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
} | null;

export type App = typeof appsTable.$inferSelect;

export const sessionPlugin = new ElysiaClass({ name: 'session' });

function parseDebugDataHeader(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
}

class SdkAuthError extends Error {
  statusCode: number;
  errorCode: string;
  detail: string;

  constructor(statusCode: number, errorCode: string, detail: string) {
    super(detail);
    this.name = 'SdkAuthError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.detail = detail;
  }
}

export const sdkAuthPlugin = new ElysiaClass({ name: 'sdkAuth' })
  .error({ SDK_AUTH_ERROR: SdkAuthError })
  .onError(({ error, set }) => {
    if (error instanceof SdkAuthError) {
      set.status = error.statusCode;
      return {
        code: error.errorCode,
        detail: error.detail,
      };
    }
  })
  .resolve(async ({ request }) => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new SdkAuthError(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Authorization header is required. Use: Authorization: Bearer <api_key>'
      );
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new SdkAuthError(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Invalid authorization format. Use: Bearer <api_key>'
      );
    }

    const bearerToken = parts[1];
    if (!bearerToken) {
      throw new SdkAuthError(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'API key is required'
      );
    }

    try {
      const app = await getAppByKey(bearerToken);

      if (!app) {
        throw new SdkAuthError(
          HttpStatus.UNAUTHORIZED,
          ErrorCode.UNAUTHORIZED,
          'Invalid API key'
        );
      }

      return {
        app,
        sdkUserId: app.userId,
        sdkDebugData: parseDebugDataHeader(
          request.headers.get('x-phase-debug-data')
        ),
      };
    } catch (error) {
      if (error instanceof SdkAuthError) {
        throw error;
      }
      console.error('[SDK Auth] App key verification error:', error);
      throw new SdkAuthError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to verify API key'
      );
    }
  })
  .as('scoped');

export const ADMIN_USER_ID = 'C28lEs9hf2vqiFyQDJ8JmPx4HQvQimGl';

type GuardContext = {
  request: Request;
  query: Record<string, string | string[] | undefined>;
  set: { status?: number | string };
  user?: BetterAuthUser;
};

function guardError(
  set: GuardContext['set'],
  status: number,
  code: string,
  detail: string
) {
  set.status = status;
  return { code, detail };
}

async function resolveGuardUser(ctx: GuardContext): Promise<BetterAuthUser> {
  if (ctx.user) {
    return ctx.user;
  }
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  return (session?.user as BetterAuthUser) ?? null;
}

async function checkAppAccess(
  ctx: GuardContext,
  ownerOnly: boolean
): Promise<{ code: string; detail: string } | undefined> {
  const user = await resolveGuardUser(ctx);
  if (!user) {
    return guardError(
      ctx.set,
      HttpStatus.UNAUTHORIZED,
      ErrorCode.UNAUTHORIZED,
      'Authentication required'
    );
  }

  const appId = ctx.query.appId;
  if (typeof appId !== 'string' || appId.length === 0) {
    return guardError(
      ctx.set,
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR,
      'appId is required'
    );
  }

  try {
    const app = ownerOnly
      ? await db.query.apps.findFirst({
          where: and(eq(appsTable.id, appId), eq(appsTable.userId, user.id)),
        })
      : await findAccessibleApp(appId, user.id);

    if (!app) {
      return guardError(
        ctx.set,
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        ownerOnly
          ? 'You must be the app owner to perform this action'
          : 'You do not have permission to access this app'
      );
    }
  } catch (error) {
    console.error('[Middleware] App access verification error:', error);
    return guardError(
      ctx.set,
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to verify app access'
    );
  }
}

// Elysia 1.4 only runs object-style macros; the old functional
// `macro(({ onBeforeHandle }) => ...)` form silently registers nothing.
export const authPlugin = new ElysiaClass({ name: 'auth' }).macro({
  requireAuth(enabled: boolean) {
    if (!enabled) {
      return;
    }
    return {
      async beforeHandle(ctx) {
        const user = await resolveGuardUser(ctx as unknown as GuardContext);
        if (!user) {
          return guardError(
            ctx.set,
            HttpStatus.UNAUTHORIZED,
            ErrorCode.UNAUTHORIZED,
            'Authentication required'
          );
        }
      },
    };
  },

  requireAdmin(enabled: boolean) {
    if (!enabled) {
      return;
    }
    return {
      async beforeHandle(ctx) {
        const user = await resolveGuardUser(ctx as unknown as GuardContext);
        if (!user) {
          return guardError(
            ctx.set,
            HttpStatus.UNAUTHORIZED,
            ErrorCode.UNAUTHORIZED,
            'Authentication required'
          );
        }
        if (user.id !== ADMIN_USER_ID) {
          return guardError(
            ctx.set,
            HttpStatus.FORBIDDEN,
            ErrorCode.FORBIDDEN,
            'Admin access required'
          );
        }
      },
    };
  },

  requireAppKey(enabled: boolean) {
    if (!enabled) {
      return;
    }
    return {
      async beforeHandle(ctx) {
        const [scheme, appKey] = (
          ctx.request.headers.get('authorization') ?? ''
        ).split(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !appKey) {
          return guardError(
            ctx.set,
            HttpStatus.UNAUTHORIZED,
            ErrorCode.UNAUTHORIZED,
            'Authorization header is required. Use: Bearer <app_key>'
          );
        }
        try {
          if (!(await getAppByKey(appKey))) {
            return guardError(
              ctx.set,
              HttpStatus.UNAUTHORIZED,
              ErrorCode.UNAUTHORIZED,
              'Invalid app key'
            );
          }
        } catch (error) {
          console.error('[Middleware] App key verification error:', error);
          return guardError(
            ctx.set,
            HttpStatus.INTERNAL_SERVER_ERROR,
            ErrorCode.INTERNAL_SERVER_ERROR,
            'Failed to verify app key'
          );
        }
      },
    };
  },

  verifyAppAccess(enabled: boolean) {
    if (!enabled) {
      return;
    }
    return {
      beforeHandle: (ctx) =>
        checkAppAccess(ctx as unknown as GuardContext, false),
    };
  },

  verifyAppOwnership(enabled: boolean) {
    if (!enabled) {
      return;
    }
    return {
      beforeHandle: (ctx) =>
        checkAppAccess(ctx as unknown as GuardContext, true),
    };
  },
});
