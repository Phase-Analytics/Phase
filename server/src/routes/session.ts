import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { db, sessions } from '@/db';
import { badRequest, internalServerError } from '@/lib/response';
import { errorResponses, paginationSchema } from '@/lib/schemas';
import { ErrorCode, HttpStatus } from '@/types/codes';

const sessionSchema = z.object({
  sessionId: z.string(),
  deviceId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});

const createSessionRequestSchema = z.object({
  sessionId: z.string(),
  deviceId: z.string(),
  startedAt: z.string(),
});

const endSessionRequestSchema = z.object({
  sessionId: z.string(),
  endedAt: z.string().optional(),
});

const sessionsListResponseSchema = z.object({
  sessions: z.array(sessionSchema),
  pagination: paginationSchema,
});

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
    query: z.object({
      deviceId: z.string(),
      page: z.string().optional().default('1'),
      pageSize: z.string().optional().default('50'),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
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

    const device = await db.query.devices.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.deviceId, body.deviceId),
    });

    if (!device) {
      return badRequest(c, ErrorCode.VALIDATION_ERROR, 'Device not found');
    }

    const existingSession = await db.query.sessions.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.sessionId, body.sessionId),
    });

    if (existingSession) {
      return badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Session with this ID already exists'
      );
    }

    const clientStartedAt = new Date(body.startedAt);
    const serverTimestamp = new Date();

    if (Number.isNaN(clientStartedAt.getTime())) {
      return badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'Invalid startedAt format'
      );
    }

    const timeDiffMs = Math.abs(
      serverTimestamp.getTime() - clientStartedAt.getTime()
    );
    const oneHourMs = 60 * 60 * 1000;

    if (timeDiffMs > oneHourMs) {
      return badRequest(
        c,
        ErrorCode.VALIDATION_ERROR,
        'startedAt is too far from server time (max 1 hour difference)'
      );
    }

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
    console.error('[Session] Create error:', error);
    return internalServerError(c, 'Failed to create session');
  }
});

sessionRouter.openapi(endSessionRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    const existingSession = await db.query.sessions.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.sessionId, body.sessionId),
    });

    if (!existingSession) {
      return badRequest(c, ErrorCode.VALIDATION_ERROR, 'Session not found');
    }

    if (existingSession.endedAt) {
      return badRequest(c, ErrorCode.VALIDATION_ERROR, 'Session already ended');
    }

    const serverTimestamp = new Date();
    let clientEndedAt = serverTimestamp;

    if (body.endedAt) {
      clientEndedAt = new Date(body.endedAt);

      if (Number.isNaN(clientEndedAt.getTime())) {
        return badRequest(
          c,
          ErrorCode.VALIDATION_ERROR,
          'Invalid endedAt format'
        );
      }

      const timeDiffMs = Math.abs(
        serverTimestamp.getTime() - clientEndedAt.getTime()
      );
      const oneHourMs = 60 * 60 * 1000;

      if (timeDiffMs > oneHourMs) {
        return badRequest(
          c,
          ErrorCode.VALIDATION_ERROR,
          'endedAt is too far from server time (max 1 hour difference)'
        );
      }
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
    console.error('[Session] End error:', error);
    return internalServerError(c, 'Failed to end session');
  }
});

sessionRouter.openapi(getSessionsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { deviceId } = query;

    const device = await db.query.devices.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.deviceId, deviceId),
    });

    if (!device) {
      return badRequest(c, ErrorCode.VALIDATION_ERROR, 'Device not found');
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

    filters.push(eq(sessions.deviceId, deviceId));

    if (query.startDate) {
      filters.push(gte(sessions.startedAt, new Date(query.startDate)));
    }

    if (query.endDate) {
      filters.push(lte(sessions.startedAt, new Date(query.endDate)));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

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

    const totalPages = Math.ceil(totalCount / pageSize);

    const formattedSessions = sessionsList.map((session) => ({
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    }));

    return c.json(
      {
        sessions: formattedSessions,
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
    console.error('[Session] List error:', error);
    return internalServerError(c, 'Failed to fetch sessions');
  }
});

export default sessionRouter;
