import { ErrorCode, HttpStatus } from '@phase/shared';
import { count, desc, eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { apps, db, devices, sessions, user } from '@/db';
import { auth } from '@/lib/auth';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import {
  getQuestDBEventStorageDiagnostics,
  getTotalEventCount,
} from '@/lib/questdb';

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

export const adminWebRouter = new Elysia({ prefix: '/admin' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return {
      user: session?.user as BetterAuthUser,
      session: session?.session as BetterAuthSession,
    };
  })
  .use(authPlugin)
  .get(
    '/stats',
    async (ctx) => {
      const { set } = ctx as typeof ctx & AuthContext;
      try {
        const [
          totalUsersResult,
          totalAppsResult,
          totalDevicesResult,
          totalSessionsResult,
          totalEvents,
        ] = await Promise.all([
          db.select({ count: count() }).from(user),
          db.select({ count: count() }).from(apps),
          db.select({ count: count() }).from(devices),
          db.select({ count: count() }).from(sessions),
          getTotalEventCount(),
        ]);

        set.status = HttpStatus.OK;
        return {
          totalUsers: Number(totalUsersResult[0]?.count || 0),
          totalApps: Number(totalAppsResult[0]?.count || 0),
          totalDevices: Number(totalDevicesResult[0]?.count || 0),
          totalSessions: Number(totalSessionsResult[0]?.count || 0),
          totalEvents,
        };
      } catch (error) {
        console.error('[Admin.Stats] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to get admin stats',
        };
      }
    },
    {
      requireAdmin: true,
      response: {
        200: t.Object({
          totalUsers: t.Number(),
          totalApps: t.Number(),
          totalDevices: t.Number(),
          totalSessions: t.Number(),
          totalEvents: t.Number(),
        }),
        401: t.Object({
          code: t.String(),
          detail: t.String(),
        }),
        403: t.Object({
          code: t.String(),
          detail: t.String(),
        }),
        500: t.Object({
          code: t.String(),
          detail: t.String(),
        }),
      },
    }
  )
  .get(
    '/questdb/events',
    async (ctx) => {
      const { set } = ctx as typeof ctx & AuthContext;
      try {
        const diagnostics = await getQuestDBEventStorageDiagnostics();

        set.status = HttpStatus.OK;
        return diagnostics;
      } catch (error) {
        console.error('[Admin.QuestDB.Events] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to get QuestDB event diagnostics',
        };
      }
    },
    {
      requireAdmin: true,
      response: {
        200: t.Object({
          readTables: t.Array(t.String()),
          writeTable: t.String(),
          schemaVerified: t.Boolean(),
          schemaError: t.Union([t.String(), t.Null()]),
          tables: t.Array(
            t.Object({
              tableName: t.String(),
              rowCount: t.Number(),
              minTimestamp: t.Union([t.String(), t.Null()]),
              maxTimestamp: t.Union([t.String(), t.Null()]),
              partitionBy: t.Union([t.String(), t.Null()]),
              walEnabled: t.Boolean(),
              dedup: t.Boolean(),
              ttlValue: t.Union([t.Number(), t.Null()]),
              ttlUnit: t.Union([t.String(), t.Null()]),
            })
          ),
        }),
        401: t.Object({
          code: t.String(),
          detail: t.String(),
        }),
        403: t.Object({
          code: t.String(),
          detail: t.String(),
        }),
        500: t.Object({
          code: t.String(),
          detail: t.String(),
        }),
      },
    }
  )
  .get(
    '/users',
    async (ctx) => {
      const { set } = ctx as typeof ctx & AuthContext;
      try {
        // Aggregate per app, then per owner, instead of COUNT(DISTINCT) over
        // the user x app x device join.
        const devicesPerApp = db
          .select({
            appId: devices.appId,
            deviceCount: count().as('app_devices'),
          })
          .from(devices)
          .groupBy(devices.appId)
          .as('devices_per_app');
        const appsPerOwner = db
          .select({
            userId: apps.userId,
            appCount: count().as('app_count'),
            deviceCount:
              sql<number>`COALESCE(SUM(${devicesPerApp.deviceCount}), 0)`.as(
                'device_count'
              ),
          })
          .from(apps)
          .leftJoin(devicesPerApp, eq(devicesPerApp.appId, apps.id))
          .groupBy(apps.userId)
          .as('apps_per_owner');

        const usersWithStats = await db
          .select({
            userId: user.id,
            email: user.email,
            createdAt: user.createdAt,
            appCount: appsPerOwner.appCount,
            deviceCount: appsPerOwner.deviceCount,
          })
          .from(user)
          .leftJoin(appsPerOwner, eq(appsPerOwner.userId, user.id))
          .orderBy(desc(user.createdAt));

        set.status = HttpStatus.OK;
        return {
          users: usersWithStats.map((u) => ({
            userId: u.userId,
            email: u.email,
            appCount: Number(u.appCount || 0),
            deviceCount: Number(u.deviceCount || 0),
            createdAt: u.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        console.error('[Admin.Users] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to get users list',
        };
      }
    },
    {
      requireAdmin: true,
      response: {
        200: t.Object({
          users: t.Array(
            t.Object({
              userId: t.String(),
              email: t.String(),
              appCount: t.Number(),
              deviceCount: t.Number(),
              createdAt: t.String(),
            })
          ),
        }),
        401: t.Object({
          code: t.String(),
          detail: t.String(),
        }),
        403: t.Object({
          code: t.String(),
          detail: t.String(),
        }),
        500: t.Object({
          code: t.String(),
          detail: t.String(),
        }),
      },
    }
  );
