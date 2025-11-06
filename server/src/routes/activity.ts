import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { App, Session, User } from '@/db/schema';
import { requireAuth, verifyAppOwnership } from '@/lib/middleware';
import { getActivity } from '@/lib/questdb';
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
  errorDataSchema,
  errorResponses,
  eventDataSchema,
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
    app: App;
  };
}>();

activityWebRouter.use('*', requireAuth, verifyAppOwnership);

activityWebRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

activityWebRouter.openapi(getActivityRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { sessionId, appId } = query;

    const sessionValidation = await validateSession(c, sessionId, appId);
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

    const { activities: activitiesResult, total: totalCount } =
      await getActivity({
        sessionId,
        startDate: query.startDate || undefined,
        endDate: query.endDate || undefined,
        limit: pageSize,
        offset,
      });

    const activities: ActivityItem[] = activitiesResult
      .map((row) => {
        const baseActivity = {
          id: row.id,
          sessionId: row.session_id,
          timestamp: new Date(row.timestamp).toISOString(),
        };

        try {
          const data = JSON.parse(row.data);

          if (row.type === 'event') {
            const validationResult = eventDataSchema.safeParse(data);
            if (!validationResult.success) {
              console.error('[Activity.List] Invalid event data:', {
                rowId: row.id,
                error: validationResult.error,
              });
              return null;
            }

            return {
              type: 'event' as const,
              ...baseActivity,
              data: validationResult.data,
            };
          }

          const validationResult = errorDataSchema.safeParse(data);
          if (!validationResult.success) {
            console.error('[Activity.List] Invalid error data:', {
              rowId: row.id,
              error: validationResult.error,
            });
            return null;
          }

          return {
            type: 'error' as const,
            ...baseActivity,
            data: validationResult.data,
          };
        } catch (error) {
          console.error('[Activity.List] Failed to parse data:', {
            rowId: row.id,
            error,
          });
          return null;
        }
      })
      .filter((activity): activity is ActivityItem => activity !== null);

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

export { activityWebRouter };
