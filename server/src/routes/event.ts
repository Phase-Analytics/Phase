import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { count, desc, eq, type SQL } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db, events, sessions } from '@/db';
import type { ApiKey, Session, User } from '@/db/schema';
import {
  requireApiKey,
  requireAuth,
  verifyApiKeyOwnership,
} from '@/lib/middleware';
import { addToQueue } from '@/lib/queue';
import { methodNotAllowed } from '@/lib/response';
import {
  buildFilters,
  formatPaginationResponse,
  validateDateRange,
  validateDevice,
  validatePagination,
  validateSession,
  validateTimestamp,
} from '@/lib/validators';
import {
  createEventRequestSchema,
  ErrorCode,
  errorResponses,
  eventSchema,
  eventsListResponseSchema,
  HttpStatus,
  listEventsQuerySchema,
} from '@/schemas';

const createEventRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['event'],
  description: 'Create a new event',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createEventRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Event created',
      content: {
        'application/json': {
          schema: eventSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getEventsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['event'],
  description: 'List events for a specific session',
  security: [{ CookieAuth: [] }],
  request: {
    query: listEventsQuerySchema,
  },
  responses: {
    200: {
      description: 'Events list',
      content: {
        'application/json': {
          schema: eventsListResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const eventSdkRouter = new OpenAPIHono<{
  Variables: {
    apiKey: ApiKey;
    userId: string;
  };
}>();

eventSdkRouter.use('*', requireApiKey);

eventSdkRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['POST'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

const eventWebRouter = new OpenAPIHono<{
  Variables: {
    user: User;
    session: Session;
    apiKey: ApiKey;
  };
}>();

eventWebRouter.use('*', requireAuth, verifyApiKeyOwnership);

eventWebRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

eventSdkRouter.openapi(createEventRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const apiKey = c.get('apiKey');

    if (!apiKey?.id) {
      return c.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'API key is required',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    const sessionValidation = await validateSession(
      c,
      body.sessionId,
      apiKey.id
    );
    if (!sessionValidation.success) {
      return sessionValidation.response;
    }

    const timestampValidation = validateTimestamp(c, body.timestamp);
    if (!timestampValidation.success) {
      return timestampValidation.response;
    }

    const clientTimestamp = timestampValidation.data;
    const session = sessionValidation.data;

    if (clientTimestamp < session.startedAt) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Event timestamp cannot be before session startedAt',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const eventId = ulid();

    await addToQueue({
      type: 'event',
      eventId,
      sessionId: body.sessionId,
      name: body.name,
      params: body.params,
      timestamp: clientTimestamp.toISOString(),
    });

    return c.json(
      {
        eventId,
        sessionId: body.sessionId,
        name: body.name,
        params: body.params ?? null,
        timestamp: clientTimestamp.toISOString(),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Event.Create] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to create event',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Query optimization requires branching by query type (session vs device)
eventWebRouter.openapi(getEventsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { sessionId, deviceId, apiKeyId } = query;

    if (sessionId) {
      const sessionValidation = await validateSession(c, sessionId, apiKeyId);
      if (!sessionValidation.success) {
        return sessionValidation.response;
      }
    }

    if (deviceId) {
      const deviceValidation = await validateDevice(c, deviceId, apiKeyId);
      if (!deviceValidation.success) {
        return deviceValidation.response;
      }
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

    let eventsList: (typeof events.$inferSelect)[];
    let totalCount: number;

    if (sessionId) {
      const filters: SQL[] = [eq(events.sessionId, sessionId)];

      if (query.eventName) {
        filters.push(eq(events.name, query.eventName));
      }

      const whereClause = buildFilters({
        filters,
        startDateColumn: events.timestamp,
        startDateValue: query.startDate,
        endDateColumn: events.timestamp,
        endDateValue: query.endDate,
      });

      [eventsList, [{ count: totalCount }]] = await Promise.all([
        db
          .select()
          .from(events)
          .where(whereClause)
          .orderBy(desc(events.timestamp))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(events).where(whereClause),
      ]);
    } else if (deviceId) {
      const filters: SQL[] = [eq(sessions.deviceId, deviceId)];

      if (query.eventName) {
        filters.push(eq(events.name, query.eventName));
      }

      const whereClause = buildFilters({
        filters,
        startDateColumn: events.timestamp,
        startDateValue: query.startDate,
        endDateColumn: events.timestamp,
        endDateValue: query.endDate,
      });

      [eventsList, [{ count: totalCount }]] = await Promise.all([
        db
          .select({
            eventId: events.eventId,
            sessionId: events.sessionId,
            name: events.name,
            params: events.params,
            timestamp: events.timestamp,
          })
          .from(events)
          .innerJoin(sessions, eq(events.sessionId, sessions.sessionId))
          .where(whereClause)
          .orderBy(desc(events.timestamp))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: count() })
          .from(events)
          .innerJoin(sessions, eq(events.sessionId, sessions.sessionId))
          .where(whereClause),
      ]);
    } else {
      return c.json(
        {
          code: ErrorCode.BAD_REQUEST,
          detail: 'Either sessionId or deviceId must be provided',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const formattedEvents = eventsList.map((event) => ({
      eventId: event.eventId,
      sessionId: event.sessionId,
      name: event.name,
      params: event.params,
      timestamp: event.timestamp.toISOString(),
    }));

    return c.json(
      {
        events: formattedEvents,
        pagination: formatPaginationResponse(totalCount, page, pageSize),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Event.List] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch events',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export { eventSdkRouter, eventWebRouter };
