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

export const sessionPlugin = new ElysiaClass({ name: 'session' })
  .resolve(async ({ request }) => {
    console.log('========================================');
    console.log('[SessionPlugin] Request URL:', request.url);
    console.log('[SessionPlugin] Request Method:', request.method);
    console.log('[SessionPlugin] Cookie Header:', request.headers.get('cookie'));
    console.log('[SessionPlugin] Authorization Header:', request.headers.get('authorization'));

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    console.log('[SessionPlugin] Session Result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      sessionId: session?.session?.id,
    });
    console.log('========================================');

    return {
      user: session?.user as BetterAuthUser,
      session: session?.session as BetterAuthSession,
    };
  });

const appContextPlugin = new ElysiaClass({ name: 'app-context' }).state({
  app: null as App | null,
  userId: null as string | null,
});

export const authPlugin = new ElysiaClass({ name: 'auth' })
  .use(sessionPlugin)
  .use(appContextPlugin)
  .macro(({ onBeforeHandle }) => ({
    requireAuth(enabled: boolean) {
      if (!enabled) {
        return;
      }

      onBeforeHandle(
        ({
          user,
          set,
        }: {
          user: BetterAuthUser;
          set: { status: number; headers: Record<string, string> };
        }) => {
          console.log('[requireAuth] Checking auth - User:', user ? { id: user.id, email: user.email } : null);
          if (!user) {
            console.log('[requireAuth] BLOCKED - No user found');
            set.status = HttpStatus.UNAUTHORIZED;
            return {
              code: ErrorCode.UNAUTHORIZED,
              detail: 'Authentication required',
            };
          }
          console.log('[requireAuth] PASSED - User authenticated');
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
          user,
          query,
          set,
          store,
        }: {
          user: BetterAuthUser;
          query: Record<string, string | string[] | undefined>;
          set: { status: number; headers: Record<string, string> };
          store: { app: App | null; userId: string | null };
        }) => {
          if (!user) {
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
                  eq(appsTable.userId, user.id),
                  sql`${user.id} = ANY(${appsTable.memberIds})`
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
          user,
          query,
          set,
          store,
        }: {
          user: BetterAuthUser;
          query: Record<string, string | string[] | undefined>;
          set: { status: number; headers: Record<string, string> };
          store: { app: App | null; userId: string | null };
        }) => {
          if (!user) {
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
                eq(appsTable.userId, user.id)
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
