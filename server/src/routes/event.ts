import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { count, desc, eq, type SQL } from 'drizzle-orm';
import { db, events } from '@/db';
import { internalServerError } from '@/lib/response';
import { errorResponses, paginationSchema } from '@/lib/schemas';
import {
  buildFilters,
  formatPaginationResponse,
  validatePagination,
  validateSession,
  validateTimestamp,
} from '@/lib/validators';
import { addAnalyticsEvent } from '@/queue';
import { HttpStatus } from '@/types/codes';

const eventSchema = z.object({
  eventId: z.string(),
  sessionId: z.string(),
  name: z.string(),
  params: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .nullable(),
  timestamp: z.string(),
});

const createEventRequestSchema = z.object({
  eventId: z.string(),
  sessionId: z.string(),
  name: z.string(),
  params: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .optional(),
  timestamp: z.string(),
});

const eventsListResponseSchema = z.object({
  events: z.array(eventSchema),
  pagination: paginationSchema,
});

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
    query: z.object({
      sessionId: z.string(),
      page: z.string().optional().default('1'),
      pageSize: z.string().optional().default('50'),
      eventName: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
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

    await addAnalyticsEvent({
      eventId: body.eventId,
      sessionId: body.sessionId,
      name: body.name,
      params: body.params,
      timestamp: clientTimestamp.getTime(),
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
    return internalServerError(c, 'Failed to create event');
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

    const formattedEvents = eventsList.map((event) => ({
      eventId: event.eventId,
      sessionId: event.sessionId,
      name: event.name,
      params: event.params ? JSON.parse(event.params) : null,
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
    return internalServerError(c, 'Failed to fetch events');
  }
});

export default eventRouter;
