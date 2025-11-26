import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db, sessions } from '@/db';
import type { App, Session, User } from '@/db/schema';
import { requireAppKey, requireAuth, verifyAppAccess } from '@/lib/middleware';
import {
  getEventById,
  getEventStats,
  getEvents,
  getEventTimeseries,
  getTopEvents,
  writeEvent,
} from '@/lib/questdb';
import { methodNotAllowed } from '@/lib/response';
import {
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
  eventOverviewQuerySchema,
  eventOverviewResponseSchema,
  eventSchema,
  eventsListResponseSchema,
  eventTimeseriesQuerySchema,
  eventTimeseriesResponseSchema,
  getEventQuerySchema,
  HttpStatus,
  listEventsQuerySchema,
  topEventsQuerySchema,
  topEventsResponseSchema,
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

const getTopEventsRoute = createRoute({
  method: 'get',
  path: '/top',
  tags: ['event'],
  description: 'Get top 6 most frequent events by count for an app',
  security: [{ CookieAuth: [] }],
  request: {
    query: topEventsQuerySchema,
  },
  responses: {
    200: {
      description: 'Top events (max 6)',
      content: {
        'application/json': {
          schema: topEventsResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getEventOverviewRoute = createRoute({
  method: 'get',
  path: '/overview',
  tags: ['event'],
  description: 'Get event overview metrics (total events, 24h events)',
  security: [{ CookieAuth: [] }],
  request: {
    query: eventOverviewQuerySchema,
  },
  responses: {
    200: {
      description: 'Event overview metrics',
      content: {
        'application/json': {
          schema: eventOverviewResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getEventTimeseriesRoute = createRoute({
  method: 'get',
  path: '/timeseries',
  tags: ['event'],
  description: 'Get event timeseries data (daily event count)',
  security: [{ CookieAuth: [] }],
  request: {
    query: eventTimeseriesQuerySchema,
  },
  responses: {
    200: {
      description: 'Event timeseries data',
      content: {
        'application/json': {
          schema: eventTimeseriesResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getEventRoute = createRoute({
  method: 'get',
  path: '/:eventId',
  tags: ['event'],
  description: 'Get event details by ID',
  security: [{ CookieAuth: [] }],
  request: {
    query: getEventQuerySchema,
  },
  responses: {
    200: {
      description: 'Event details',
      content: {
        'application/json': {
          schema: eventSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const eventSdkRouter = new OpenAPIHono<{
  Variables: {
    app: App;
    userId: string;
  };
}>();

eventSdkRouter.use('*', requireAppKey);

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
    app: App;
  };
}>();

eventWebRouter.use('*', requireAuth, verifyAppAccess);

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
    const app = c.get('app');

    if (!app?.id) {
      return c.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'App key is required',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    const sessionValidation = await validateSession(c, body.sessionId, app.id);
    if (!sessionValidation.success) {
      return sessionValidation.response;
    }

    const timestampValidation = validateTimestamp(c, body.timestamp);
    if (!timestampValidation.success) {
      return timestampValidation.response;
    }

    const clientTimestamp = timestampValidation.data;
    const { session, device } = sessionValidation.data;

    if (clientTimestamp < session.startedAt) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Event timestamp cannot be before session startedAt',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (session.startedAt < oneDayAgo) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Session is too old (>24h), please start a new session',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    if (clientTimestamp <= session.lastActivityAt) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Event timestamp must be after last activity',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const eventId = ulid();

    await writeEvent({
      eventId,
      sessionId: body.sessionId,
      deviceId: session.deviceId,
      appId: device.appId,
      name: body.name,
      params: body.params ?? null,
      timestamp: clientTimestamp,
    });

    await db
      .update(sessions)
      .set({ lastActivityAt: clientTimestamp })
      .where(eq(sessions.sessionId, session.sessionId));

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

eventWebRouter.openapi(getEventsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { sessionId, deviceId, appId } = query;

    if (sessionId) {
      const sessionValidation = await validateSession(c, sessionId, appId);
      if (!sessionValidation.success) {
        return sessionValidation.response;
      }
    } else if (deviceId) {
      const deviceValidation = await validateDevice(c, deviceId, appId);
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

    const { events: eventsList, total: totalCount } = await getEvents({
      sessionId: sessionId || undefined,
      deviceId: deviceId || undefined,
      appId,
      eventName: query.eventName || undefined,
      startDate: query.startDate || undefined,
      endDate: query.endDate || undefined,
      limit: pageSize,
      offset,
    });

    const formattedEvents = eventsList.map((event) => {
      let timestamp: string;
      try {
        const parsed = new Date(event.timestamp);
        timestamp = Number.isNaN(parsed.getTime())
          ? new Date().toISOString()
          : parsed.toISOString();
      } catch {
        timestamp = new Date().toISOString();
      }

      return {
        eventId: event.event_id,
        name: event.name,
        deviceId: event.device_id,
        timestamp,
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

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
eventWebRouter.openapi(getEventOverviewRoute, async (c: any) => {
  try {
    const query = c.req.valid('query');
    const { appId } = query;

    const stats = await getEventStats({ appId });

    return c.json(stats, HttpStatus.OK);
  } catch (error) {
    console.error('[Event.Overview] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch event overview',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

eventWebRouter.openapi(getTopEventsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { appId, startDate, endDate } = query;

    const dateRangeValidation = validateDateRange(c, startDate, endDate);
    if (!dateRangeValidation.success) {
      return dateRangeValidation.response;
    }

    const topEvents = await getTopEvents({
      appId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: 6,
    });

    return c.json(
      {
        events: topEvents,
        appId,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Event.TopEvents] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch top events',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
eventWebRouter.openapi(getEventTimeseriesRoute, async (c: any) => {
  try {
    const query = c.req.valid('query');
    const { appId, startDate, endDate } = query;

    const dateRangeValidation = validateDateRange(c, startDate, endDate);
    if (!dateRangeValidation.success) {
      return dateRangeValidation.response;
    }

    const result = await getEventTimeseries({
      appId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return c.json(result, HttpStatus.OK);
  } catch (error) {
    console.error('[Event.Timeseries] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch event timeseries',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
eventWebRouter.openapi(getEventRoute, async (c: any) => {
  try {
    const { eventId } = c.req.param();
    const query = c.req.valid('query');
    const { appId } = query;

    const event = await getEventById({ eventId, appId });

    if (!event) {
      return c.json(
        {
          code: ErrorCode.NOT_FOUND,
          detail: 'Event not found',
        },
        HttpStatus.NOT_FOUND
      );
    }

    let parsedParams: Record<string, string | number | boolean | null> | null =
      null;
    if (event.params) {
      try {
        parsedParams = JSON.parse(event.params);
      } catch (error) {
        console.error(
          `[Event.Get] Failed to parse params for event ${event.event_id}:`,
          error
        );
        parsedParams = null;
      }
    }

    let timestamp: string;
    try {
      const parsed = new Date(event.timestamp);
      timestamp = Number.isNaN(parsed.getTime())
        ? new Date().toISOString()
        : parsed.toISOString();
    } catch {
      timestamp = new Date().toISOString();
    }

    return c.json(
      {
        eventId: event.event_id,
        sessionId: event.session_id,
        name: event.name,
        params: parsedParams,
        timestamp,
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Event.Get] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch event',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export { eventSdkRouter, eventWebRouter };
