import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { db, events } from '@/db';
import { badRequest, internalServerError } from '@/lib/response';
import { errorResponses, paginationSchema } from '@/lib/schemas';
import { addAnalyticsEvent } from '@/queue';
import { ErrorCode, HttpStatus } from '@/types/codes';

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

    const session = await db.query.sessions.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.sessionId, body.sessionId),
    });

    if (!session) {
      return badRequest(c, ErrorCode.VALIDATION_ERROR, 'Session not found');
    }

    const clientTimestamp = new Date(body.timestamp);
    const serverTimestamp = new Date();

    if (Number.isNaN(clientTimestamp.getTime())) {
      return badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Invalid timestamp format'
      );
    }

    const timeDiffMs = Math.abs(
      serverTimestamp.getTime() - clientTimestamp.getTime()
    );
    const oneHourMs = 60 * 60 * 1000;

    if (timeDiffMs > oneHourMs) {
      return badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Timestamp is too far from server time (max 1 hour difference)'
      );
    }

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
    console.error('[Event] Create error:', error);
    return internalServerError(c, 'Failed to create event');
  }
});

eventRouter.openapi(getEventsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { sessionId } = query;

    const session = await db.query.sessions.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.sessionId, sessionId),
    });

    if (!session) {
      return badRequest(c, ErrorCode.VALIDATION_ERROR, 'Session not found');
    }

    const page = Number.parseInt(query.page, 10);
    const pageSize = Number.parseInt(query.pageSize, 10);

    if (Number.isNaN(page) || page < 1) {
      return badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Invalid page parameter: must be a positive integer'
      );
    }

    if (Number.isNaN(pageSize) || pageSize < 1) {
      return badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Invalid pageSize parameter: must be a positive integer'
      );
    }

    const offset = (page - 1) * pageSize;

    const filters: ReturnType<typeof eq | typeof gte | typeof lte>[] = [];

    filters.push(eq(events.sessionId, sessionId));

    if (query.eventName) {
      filters.push(eq(events.name, query.eventName));
    }

    if (query.startDate) {
      filters.push(gte(events.timestamp, new Date(query.startDate)));
    }

    if (query.endDate) {
      filters.push(lte(events.timestamp, new Date(query.endDate)));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

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

    const totalPages = Math.ceil(totalCount / pageSize);

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
        pagination: {
          total: totalCount,
          page,
          pageSize,
          totalPages,
        },
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Event] List error:', error);
    return internalServerError(c, 'Failed to fetch events');
  }
});

export default eventRouter;
