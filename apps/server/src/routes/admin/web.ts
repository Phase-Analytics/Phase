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

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

async function getTotalEventsFromQuestDB(): Promise<number> {
  try {
    const QUESTDB_HTTP = 'http://questdb:9000';
    const query = 'SELECT COUNT(*) as count FROM events';
    const url = `${QUESTDB_HTTP}/exec`;

    const response = await fetch(`${url}?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Admin] QuestDB query failed:', response.statusText);
      return 0;
    }

    const result = (await response.json()) as {
      columns: Array<{ name: string; type: string }>;
      dataset: unknown[][];
    };

    return (result.dataset[0]?.[0] as number) || 0;
  } catch (error) {
    console.error('[Admin] Failed to get total events from QuestDB:', error);
    return 0;
  }
}

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
        ] = await Promise.all([
          db.select({ count: count() }).from(user),
          db.select({ count: count() }).from(apps),
          db.select({ count: count() }).from(devices),
          db.select({ count: count() }).from(sessions),
        ]);

        const totalEvents = await getTotalEventsFromQuestDB();

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
    '/users',
    async (ctx) => {
      const { set } = ctx as typeof ctx & AuthContext;
      try {
        const usersWithStats = await db
          .select({
            userId: user.id,
            email: user.email,
            createdAt: user.createdAt,
            appCount: sql<number>`COUNT(DISTINCT ${apps.id})`,
            deviceCount: sql<number>`COUNT(DISTINCT ${devices.deviceId})`,
          })
          .from(user)
          .leftJoin(apps, eq(apps.userId, user.id))
          .leftJoin(devices, eq(devices.appId, apps.id))
          .groupBy(user.id, user.email, user.createdAt)
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
