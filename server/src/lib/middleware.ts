import { and, eq, or, sql } from 'drizzle-orm';
import { Elysia as ElysiaClass } from 'elysia';
import { apps as appsTable, db } from '@/db';
import { auth } from '@/lib/auth';
import { ErrorCode, HttpStatus } from '@/schemas/common';

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
      const app = await db.query.apps.findFirst({
        where: eq(appsTable.key, bearerToken),
      });

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

export const authPlugin = new ElysiaClass({ name: 'auth' })
  .state({
    app: null as App | null,
    userId: null as string | null,
  })
  .macro(({ onBeforeHandle }) => ({
    requireAuth(enabled: boolean) {
      if (!enabled) {
        return;
      }

      onBeforeHandle(
        ({ user, set }: { user: BetterAuthUser; set: { status: number } }) => {
          if (!user) {
            set.status = HttpStatus.UNAUTHORIZED;
            return {
              code: ErrorCode.UNAUTHORIZED,
              detail: 'Authentication required',
            };
          }
        }
      );
    },

    requireAppKey(enabled: boolean) {
      if (!enabled) {
        return;
      }

      onBeforeHandle(
        async ({
          request,
          set,
          store,
        }: {
          request: Request;
          set: { status: number; headers: Record<string, string> };
          store: { app: App | null; userId: string | null };
        }) => {
          const authHeader = request.headers.get('authorization');

          if (!authHeader) {
            set.status = HttpStatus.UNAUTHORIZED;
            return {
              code: ErrorCode.UNAUTHORIZED,
              detail: 'Authorization header is required',
            };
          }

          const parts = authHeader.split(' ');
          if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            set.status = HttpStatus.UNAUTHORIZED;
            return {
              code: ErrorCode.UNAUTHORIZED,
              detail: 'Invalid authorization format. Use: Bearer <token>',
            };
          }

          const appKey = parts[1];

          if (!appKey) {
            set.status = HttpStatus.UNAUTHORIZED;
            return {
              code: ErrorCode.UNAUTHORIZED,
              detail: 'App key is required',
            };
          }

          try {
            const app = await db.query.apps.findFirst({
              where: eq(appsTable.key, appKey),
            });

            if (!app) {
              set.status = HttpStatus.UNAUTHORIZED;
              return {
                code: ErrorCode.UNAUTHORIZED,
                detail: 'Invalid app key',
              };
            }

            store.app = app;
            store.userId = app.userId;
          } catch (error) {
            console.error('[Middleware] App key verification error:', error);
            set.status = HttpStatus.INTERNAL_SERVER_ERROR;
            return {
              code: ErrorCode.INTERNAL_SERVER_ERROR,
              detail: 'Failed to verify app key',
            };
          }
        }
      );
    },

    verifyAppAccess(enabled: boolean) {
      if (!enabled) {
        return;
      }

      onBeforeHandle(
        async ({
          request,
          query,
          set,
          store,
        }: {
          request: Request;
          query: Record<string, string | string[] | undefined>;
          set: { status: number };
          store: { app: App | null; userId: string | null };
        }) => {
          const session = await auth.api.getSession({
            headers: request.headers,
          });

          if (!session?.user) {
            set.status = HttpStatus.UNAUTHORIZED;
            return {
              code: ErrorCode.UNAUTHORIZED,
              detail: 'Authentication required',
            };
          }

          const appId = query.appId;

          if (!appId) {
            set.status = HttpStatus.BAD_REQUEST;
            return {
              code: ErrorCode.VALIDATION_ERROR,
              detail: 'appId is required',
            };
          }

          try {
            const userApp = await db.query.apps.findFirst({
              where: and(
                eq(appsTable.id, appId as string),
                or(
                  eq(appsTable.userId, session.user.id),
                  sql`${session.user.id} = ANY(${appsTable.memberIds})`
                )
              ),
            });

            if (!userApp) {
              set.status = HttpStatus.FORBIDDEN;
              return {
                code: ErrorCode.FORBIDDEN,
                detail: 'You do not have permission to access this app',
              };
            }

            store.app = userApp;
          } catch (error) {
            console.error('[Middleware] App access verification error:', error);
            set.status = HttpStatus.INTERNAL_SERVER_ERROR;
            return {
              code: ErrorCode.INTERNAL_SERVER_ERROR,
              detail: 'Failed to verify app access',
            };
          }
        }
      );
    },

    verifyAppOwnership(enabled: boolean) {
      if (!enabled) {
        return;
      }

      onBeforeHandle(
        async ({
          request,
          query,
          set,
          store,
        }: {
          request: Request;
          query: Record<string, string | string[] | undefined>;
          set: { status: number };
          store: { app: App | null; userId: string | null };
        }) => {
          const session = await auth.api.getSession({
            headers: request.headers,
          });

          if (!session?.user) {
            set.status = HttpStatus.UNAUTHORIZED;
            return {
              code: ErrorCode.UNAUTHORIZED,
              detail: 'Authentication required',
            };
          }

          const appId = query.appId;

          if (!appId) {
            set.status = HttpStatus.BAD_REQUEST;
            return {
              code: ErrorCode.VALIDATION_ERROR,
              detail: 'appId is required',
            };
          }

          try {
            const userApp = await db.query.apps.findFirst({
              where: and(
                eq(appsTable.id, appId as string),
                eq(appsTable.userId, session.user.id)
              ),
            });

            if (!userApp) {
              set.status = HttpStatus.FORBIDDEN;
              return {
                code: ErrorCode.FORBIDDEN,
                detail: 'You must be the app owner to perform this action',
              };
            }

            store.app = userApp;
          } catch (error) {
            console.error(
              '[Middleware] App ownership verification error:',
              error
            );
            set.status = HttpStatus.INTERNAL_SERVER_ERROR;
            return {
              code: ErrorCode.INTERNAL_SERVER_ERROR,
              detail: 'Failed to verify app ownership',
            };
          }
        }
      );
    },
  }));
