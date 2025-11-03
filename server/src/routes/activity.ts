import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type { ApiKey, Session, User } from '@/db/schema';
import { requireAuth, verifyApiKeyOwnership } from '@/lib/middleware';
import { methodNotAllowed } from '@/lib/response';
import {
  formatPaginationResponse,
  validateDateRange,
  validatePagination,
  validateSession,
} from '@/lib/validators';
import {
  type ActivityItem,
  activityListResponseSchema,
  ErrorCode,
  errorResponses,
  HttpStatus,
  listActivityQuerySchema,
} from '@/schemas';

const getActivityRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['activity'],
  description: 'List activities (events + errors) for a session',
  security: [{ CookieAuth: [] }],
  request: {
    query: listActivityQuerySchema,
  },
  responses: {
    200: {
      description: 'Activity list',
      content: {
        'application/json': {
          schema: activityListResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const activityWebRouter = new OpenAPIHono<{
  Variables: {
    user: User;
    session: Session;
    apiKey: ApiKey;
  };
}>();

activityWebRouter.use('*', requireAuth, verifyApiKeyOwnership);

activityWebRouter.openapi(getActivityRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { sessionId, apiKeyId } = query;

    const sessionValidation = await validateSession(c, sessionId, apiKeyId);
    if (!sessionValidation.success) {
      return sessionValidation.response;
    }

    const paginationValidation = validatePagination(
      c,
      query.page,
      query.pageSize
    );
    if (!paginationValidation.success) {
      return paginationValidation.response;
    }

    const { page, pageSize, offset } = paginationValidation.data;

    const dateRangeValidation = validateDateRange(
      c,
      query.startDate,
      query.endDate
    );
    if (!dateRangeValidation.success) {
      return dateRangeValidation.response;
    }

    const startDateCondition = query.startDate
      ? sql`AND timestamp >= ${query.startDate}`
      : sql``;
    const endDateCondition = query.endDate
      ? sql`AND timestamp <= ${query.endDate}`
      : sql``;

    const activitiesResult = await db.execute<{
      type: 'event' | 'error';
      id: string;
      session_id: string;
      timestamp: string;
      data: Record<string, unknown>;
    }>(sql`
      (
        SELECT 
          'event' as type,
          event_id as id,
          session_id,
          timestamp,
          jsonb_build_object(
            'name', name,
            'params', params
          ) as data
        FROM events
        WHERE session_id = ${sessionId}
        ${startDateCondition}
        ${endDateCondition}
      )
      UNION ALL
      (
        SELECT 
          'error' as type,
          error_id as id,
          session_id,
          timestamp,
          jsonb_build_object(
            'message', message,
            'type', type,
            'stackTrace', stack_trace
          ) as data
        FROM errors
        WHERE session_id = ${sessionId}
        ${startDateCondition}
        ${endDateCondition}
      )
      ORDER BY timestamp DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const countResult = await db.execute<{ total: number }>(sql`
      SELECT 
        (
          SELECT COUNT(*) 
          FROM events 
          WHERE session_id = ${sessionId}
          ${startDateCondition}
          ${endDateCondition}
        ) 
        + 
        (
          SELECT COUNT(*) 
          FROM errors 
          WHERE session_id = ${sessionId}
          ${startDateCondition}
          ${endDateCondition}
        ) as total
    `);

    const activities: ActivityItem[] = activitiesResult.rows.map((row) => {
      const baseActivity = {
        id: row.id,
        sessionId: row.session_id,
        timestamp: new Date(row.timestamp).toISOString(),
      };

      if (row.type === 'event') {
        return {
          type: 'event' as const,
          ...baseActivity,
          data: row.data as {
            name: string;
            params: Record<string, string | number | boolean | null> | null;
          },
        };
      }

      return {
        type: 'error' as const,
        ...baseActivity,
        data: row.data as {
          message: string;
          type: string;
          stackTrace: string | null;
        },
      };
    });

    const totalCount = Number(countResult.rows[0]?.total ?? 0);

    return c.json(
      {
        activities,
        pagination: formatPaginationResponse(totalCount, page, pageSize),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Activity.List] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch activities',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

activityWebRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  await next();
});

export { activityWebRouter };
