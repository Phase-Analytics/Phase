import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { count, eq, sql } from 'drizzle-orm';
import { db, devices, sessions } from '@/db';
import type { ApiKey, Session, User } from '@/db/schema';
import { requireAuth, verifyApiKeyOwnership } from '@/lib/middleware';
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
  apikey: ApiKey;
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

overviewWebRouter.use('*', requireAuth, verifyApiKeyOwnership);

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
    const { apiKeyId } = query;

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const [
      [{ count: totalDevices }],
      activeDevicesResult,
      [{ count: totalSessions }],
      avgDurationResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(devices)
        .where(eq(devices.apiKeyId, apiKeyId)),

      db.execute<{ count: number }>(sql`
        SELECT COUNT(DISTINCT d.device_id) as count
        FROM devices d
        INNER JOIN sessions_analytics s ON d.device_id = s.device_id
        WHERE d.api_key_id = ${apiKeyId}
        AND s.last_activity_at >= ${twoMinutesAgo}
      `),

      db
        .select({ count: count() })
        .from(sessions)
        .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
        .where(eq(devices.apiKeyId, apiKeyId)),

      db.execute<{ avg: number | null }>(sql`
        SELECT AVG(
          EXTRACT(EPOCH FROM (s.last_activity_at - s.started_at))
        ) as avg
        FROM sessions_analytics s
        INNER JOIN devices d ON s.device_id = d.device_id
        WHERE d.api_key_id = ${apiKeyId}
      `),
    ]);

    const activeDevices = Number(activeDevicesResult.rows[0]?.count ?? 0);
    const averageSessionDuration = avgDurationResult.rows[0]?.avg
      ? Number(avgDurationResult.rows[0].avg)
      : null;

    const response: OverviewResponse = {
      totalDevices: Number(totalDevices),
      activeDevices,
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
