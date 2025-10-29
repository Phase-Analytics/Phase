import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { apiEvents, db } from '@/db';
import type { auth } from '@/lib/auth';
import { requireAuth } from '@/lib/middleware';
import { badRequest, internalServerError, unauthorized } from '@/lib/response';
import { errorResponses } from '@/lib/schemas';
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

const eventsListResponseSchema = z.object({
  events: z.array(eventSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

const getEventsWebRoute = createRoute({
  method: 'get',
  path: '/events',
  tags: ['web'],
  description:
    'List events for a specific API key (requires session authentication)',
  request: {
    query: z.object({
      apikeyId: z.string(),
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

const webRouter = new OpenAPIHono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

webRouter.use('/', requireAuth);

webRouter.openapi(getEventsWebRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const sessionUser = c.get('user');
    const { apikeyId } = query;

    if (!sessionUser) {
      return unauthorized(c, 'Session user not found');
    }

    const apikey = await db.query.apikey.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.id, apikeyId),
    });

    if (!apikey) {
      return unauthorized(c, 'API key not found');
    }

    if (apikey.userId !== sessionUser.id) {
      return unauthorized(c, 'You do not have access to this API key');
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

    filters.push(eq(apiEvents.apikeyId, apikeyId));

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
    console.error('[Events Web] List error:', error);
    return internalServerError(c, 'Failed to fetch events');
  }
});

export default webRouter;
