import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { apiEvents, db } from '@/db';
import { requireApiKey } from '@/lib/middleware';
import { badRequest, internalServerError } from '@/lib/response';
import { errorResponses } from '@/lib/schemas';
import { addApiEvent } from '@/queue';
import { ErrorCode, HttpStatus } from '@/types/errors';

const eventSchema = z.object({
  id: z.string(),
  route: z.string(),
  status: z.number(),
  processingTimeMs: z.number(),
  errorFlag: z.boolean(),
  timestamp: z.string(),
  version: z.string().optional(),
  userId: z.string(),
  apikeyId: z.string(),
});

const createEventRequestSchema = z.object({
  route: z.string(),
  status: z.number(),
  processingTimeMs: z.number(),
  errorFlag: z.boolean(),
  version: z.string().optional(),
});

const eventsListResponseSchema = z.object({
  events: z.array(eventSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

const createEventResponseSchema = z.object({
  id: z.string(),
  message: z.string(),
});

const postEventsRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['events'],
  description: 'Create a new event (requires API key)',
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
      description: 'Event created successfully',
      content: {
        'application/json': {
          schema: createEventResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getEventsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['events'],
  description: 'List all events (requires API key)',
  request: {
    query: z.object({
      page: z.string().optional().default('1'),
      pageSize: z.string().optional().default('50'),
      route: z.string().optional(),
      status: z.string().optional(),
      errorFlag: z.string().optional(),
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

const eventsRouter = new OpenAPIHono<{
  Variables: {
    userId: string;
    apiKey: unknown;
  };
}>();

eventsRouter.use('/', requireApiKey);

eventsRouter.openapi(postEventsRoute, (c) => {
  const body = c.req.valid('json');
  const userId = c.get('userId');
  const apiKey = c.get('apiKey');

  if (!apiKey || typeof apiKey !== 'object' || !('id' in apiKey)) {
    return internalServerError(c, 'Invalid API key context');
  }

  addApiEvent({
    route: body.route,
    status: body.status,
    processingTimeMs: body.processingTimeMs,
    errorFlag: body.errorFlag,
    timestamp: Date.now(),
    version: body.version,
    userId,
    apikeyId: String(apiKey.id),
  }).catch((error) => {
    console.error('[Events] Background queue error:', error);
  });

  return c.json(
    {
      id: 'accepted',
      message: 'Event accepted for processing',
    },
    HttpStatus.OK
  );
});

eventsRouter.openapi(getEventsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const userId = c.get('userId');
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

    filters.push(eq(apiEvents.userId, userId));

    if (query.route) {
      filters.push(eq(apiEvents.route, query.route));
    }

    if (query.status) {
      filters.push(eq(apiEvents.status, Number.parseInt(query.status, 10)));
    }

    if (query.errorFlag) {
      filters.push(eq(apiEvents.errorFlag, query.errorFlag === 'true'));
    }

    if (query.startDate) {
      filters.push(gte(apiEvents.timestamp, new Date(query.startDate)));
    }

    if (query.endDate) {
      filters.push(lte(apiEvents.timestamp, new Date(query.endDate)));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const [events, [{ count: totalCount }]] = await Promise.all([
      db
        .select()
        .from(apiEvents)
        .where(whereClause)
        .orderBy(desc(apiEvents.timestamp))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(apiEvents).where(whereClause),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const formattedEvents = events.map((event) => ({
      id: event.id,
      route: event.route,
      status: event.status,
      processingTimeMs: event.processingTimeMs,
      errorFlag: event.errorFlag,
      timestamp: event.timestamp.toISOString(),
      version: event.version ?? '',
      userId: event.userId,
      apikeyId: event.apikeyId,
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
    console.error('[Events] List error:', error);
    return internalServerError(c, 'Failed to fetch events');
  }
});

export default eventsRouter;
