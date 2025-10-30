import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { count, desc, eq, type SQL } from 'drizzle-orm';
import { db, sessions } from '@/db';
import {
  buildFilters,
  formatPaginationResponse,
  validateDevice,
  validatePagination,
  validateSession,
  validateTimestamp,
} from '@/lib/validators';
import {
  createSessionRequestSchema,
  ErrorCode,
  endSessionRequestSchema,
  errorResponses,
  HttpStatus,
  listSessionsQuerySchema,
  sessionSchema,
  sessionsListResponseSchema,
} from '@/schemas';

const createSessionRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['session'],
  description: 'Create a new session',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createSessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session created',
      content: {
        'application/json': {
          schema: sessionSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const endSessionRoute = createRoute({
  method: 'patch',
  path: '/end',
  tags: ['session'],
  description: 'End an active session',
  request: {
    body: {
      content: {
        'application/json': {
          schema: endSessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session ended',
      content: {
        'application/json': {
          schema: sessionSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getSessionsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['session'],
  description: 'List sessions for a specific device',
  request: {
    query: listSessionsQuerySchema,
  },
  responses: {
    200: {
      description: 'Sessions list',
      content: {
        'application/json': {
          schema: sessionsListResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const sessionRouter = new OpenAPIHono();

sessionRouter.openapi(createSessionRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    const deviceValidation = await validateDevice(c, body.deviceId);
    if (!deviceValidation.success) {
      return deviceValidation.response;
    }

    const existingSession = await db.query.sessions.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.sessionId, body.sessionId),
    });

    if (existingSession) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Session with this ID already exists',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const timestampValidation = validateTimestamp(
      c,
      body.startedAt,
      'startedAt'
    );
    if (!timestampValidation.success) {
      return timestampValidation.response;
    }

    const clientStartedAt = timestampValidation.data;

    const [newSession] = await db
      .insert(sessions)
      .values({
        sessionId: body.sessionId,
        deviceId: body.deviceId,
        startedAt: clientStartedAt,
        endedAt: null,
      })
      .returning();

    return c.json(
      {
        sessionId: newSession.sessionId,
        deviceId: newSession.deviceId,
        startedAt: newSession.startedAt.toISOString(),
        endedAt: newSession.endedAt ? newSession.endedAt.toISOString() : null,
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Session.Create] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to create session',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

sessionRouter.openapi(endSessionRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    const sessionValidation = await validateSession(c, body.sessionId);
    if (!sessionValidation.success) {
      return sessionValidation.response;
    }

    const existingSession = sessionValidation.data;

    if (existingSession.endedAt) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'Session already ended',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    let clientEndedAt = new Date();

    if (body.endedAt) {
      const timestampValidation = validateTimestamp(c, body.endedAt, 'endedAt');
      if (!timestampValidation.success) {
        return timestampValidation.response;
      }
      clientEndedAt = timestampValidation.data;
    }

    const [updatedSession] = await db
      .update(sessions)
      .set({
        endedAt: clientEndedAt,
      })
      .where(eq(sessions.sessionId, body.sessionId))
      .returning();

    return c.json(
      {
        sessionId: updatedSession.sessionId,
        deviceId: updatedSession.deviceId,
        startedAt: updatedSession.startedAt.toISOString(),
        endedAt: updatedSession.endedAt
          ? updatedSession.endedAt.toISOString()
          : null,
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Session.End] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to end session',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

sessionRouter.openapi(getSessionsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { deviceId } = query;

    if (!deviceId) {
      return c.json(
        {
          code: ErrorCode.VALIDATION_ERROR,
          detail: 'deviceId is required',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const deviceValidation = await validateDevice(c, deviceId);
    if (!deviceValidation.success) {
      return deviceValidation.response;
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

    const filters: SQL[] = [eq(sessions.deviceId, deviceId)];

    const whereClause = buildFilters({
      filters,
      startDateColumn: sessions.startedAt,
      startDateValue: query.startDate,
      endDateColumn: sessions.startedAt,
      endDateValue: query.endDate,
    });

    const [sessionsList, [{ count: totalCount }]] = await Promise.all([
      db
        .select()
        .from(sessions)
        .where(whereClause)
        .orderBy(desc(sessions.startedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(sessions).where(whereClause),
    ]);

    const formattedSessions = sessionsList.map((session) => ({
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    }));

    return c.json(
      {
        sessions: formattedSessions,
        pagination: formatPaginationResponse(totalCount, page, pageSize),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Session.List] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch sessions',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export default sessionRouter;
