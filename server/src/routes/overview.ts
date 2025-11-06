import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { count, eq, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import type { App, Session, User } from '@/db/schema';
import { requireAuth, verifyAppOwnership } from '@/lib/middleware';
import { methodNotAllowed } from '@/lib/response';
import {
  ErrorCode,
  errorResponses,
  HttpStatus,
  type OverviewResponse,
  overviewQuerySchema,
  overviewResponseSchema,
} from '@/schemas';

type OverviewVariables = {
  user: User;
  session: Session;
  app: App;
};

const getOverviewRoute = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: overviewQuerySchema,
  },
  responses: {
    [HttpStatus.OK]: {
      content: {
        'application/json': {
          schema: overviewResponseSchema,
        },
      },
      description: 'Overview metrics retrieved successfully',
    },
    ...errorResponses,
  },
  tags: ['overview'],
});

const overviewWebRouter = new OpenAPIHono<{ Variables: OverviewVariables }>();

overviewWebRouter.use('*', requireAuth, verifyAppOwnership);

overviewWebRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
overviewWebRouter.openapi(getOverviewRoute, async (c: any) => {
  try {
    const query = c.req.valid('query');
    const { appId } = query;

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      [{ count: totalDevices }],
      activeDevicesResult,
      dailyActiveUsersResult,
      [{ count: totalSessions }],
      avgDurationResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(devices)
        .where(eq(devices.appId, appId)),

      db.execute<{ count: number }>(sql`
        SELECT COUNT(DISTINCT d.device_id) as count
        FROM devices d
        INNER JOIN sessions_analytics s ON d.device_id = s.device_id
        WHERE d.app_id = ${appId}
        AND s.last_activity_at >= ${twoMinutesAgo}
      `),

      db.execute<{ count: number }>(sql`
        SELECT COUNT(DISTINCT s.device_id) as count
        FROM sessions_analytics s
        INNER JOIN devices d ON s.device_id = d.device_id
        WHERE d.app_id = ${appId}
        AND s.started_at >= ${twentyFourHoursAgo}
      `),

      db
        .select({ count: count() })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(eq(devices.appId, appId)),

      db.execute<{ avg: number | null }>(sql`
        SELECT AVG(
          EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))
        ) as avg
        FROM sessions_analytics s
        INNER JOIN devices d ON s.device_id = d.device_id
        WHERE d.app_id = ${appId}
      `),
    ]);

    const activeDevices = Number(activeDevicesResult.rows[0]?.count ?? 0);
    const dailyActiveUsers = Number(dailyActiveUsersResult.rows[0]?.count ?? 0);
    const averageSessionDuration = avgDurationResult.rows[0]?.avg
      ? Number(avgDurationResult.rows[0].avg)
      : null;

    const response: OverviewResponse = {
      totalDevices: Number(totalDevices),
      activeDevices,
      dailyActiveUsers,
      totalSessions: Number(totalSessions),
      averageSessionDuration,
    };

    return c.json(response, HttpStatus.OK);
  } catch (error) {
    console.error('[Overview.Get] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch overview metrics',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export { overviewWebRouter };
