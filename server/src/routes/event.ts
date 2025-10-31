import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { count, desc, eq, type SQL } from 'drizzle-orm';
import { db, events } from '@/db';
import { addToQueue } from '@/lib/queue';
import { methodNotAllowed } from '@/lib/response';
import {
  buildFilters,
  formatPaginationResponse,
  validateDateRange,
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

const eventRouter = new OpenAPIHono();

eventRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET', 'POST'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  await next();
});

eventRouter.openapi(createEventRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    const sessionValidation = await validateSession(c, body.sessionId);
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

    await addToQueue({
      type: 'event',
      eventId: body.eventId,
      sessionId: body.sessionId,
      name: body.name,
      params: body.params,
      timestamp: clientTimestamp.toISOString(),
    });

    return c.json(
      {
        eventId: body.eventId,
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

eventRouter.openapi(getEventsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { sessionId } = query;

    const sessionValidation = await validateSession(c, sessionId);
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

    const [eventsList, [{ count: totalCount }]] = await Promise.all([
      db
        .select()
        .from(events)
        .where(whereClause)
        .orderBy(desc(events.timestamp))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(events).where(whereClause),
    ]);

    const formattedEvents = eventsList.map((event) => {
      let parsedParams: Record<
        string,
        string | number | boolean | null
      > | null = null;
      if (event.params) {
        try {
          parsedParams = JSON.parse(event.params) as Record<
            string,
            string | number | boolean | null
          >;
        } catch {
          parsedParams = null;
        }
      }

      return {
        eventId: event.eventId,
        sessionId: event.sessionId,
        name: event.name,
        params: parsedParams,
        timestamp: event.timestamp.toISOString(),
      };
    });

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

export default eventRouter;
