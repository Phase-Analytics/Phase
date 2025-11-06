import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { ulid } from 'ulid';
import type { App, Session, User } from '@/db/schema';
import {
  requireAppKey,
  requireAuth,
  verifyAppOwnership,
} from '@/lib/middleware';
import { getEvents, writeEvent } from '@/lib/questdb';
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

eventWebRouter.use('*', requireAuth, verifyAppOwnership);

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
          detail: 'API key is required',
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
    }

    if (deviceId) {
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
      let parsedParams: Record<
        string,
        string | number | boolean | null
      > | null = null;
      if (event.params) {
        try {
          parsedParams = JSON.parse(event.params);
        } catch (error) {
          console.error(
            `[Event.List] Failed to parse params for event ${event.event_id}:`,
            error
          );
          parsedParams = null;
        }
      }

      return {
        eventId: event.event_id,
        sessionId: event.session_id,
        name: event.name,
        params: parsedParams,
        timestamp: new Date(event.timestamp).toISOString(),
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

export { eventSdkRouter, eventWebRouter };
