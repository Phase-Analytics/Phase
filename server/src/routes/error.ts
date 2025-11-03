import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { count, desc, eq, type SQL } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db, devices, errors, sessions } from '@/db';
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
  validatePagination,
  validateSession,
  validateTimestamp,
} from '@/lib/validators';
import {
  createErrorRequestSchema,
  ErrorCode,
  errorResponses,
  errorSchema,
  errorsListResponseSchema,
  HttpStatus,
  listErrorsQuerySchema,
} from '@/schemas';

const createErrorRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['error'],
  description: 'Report an error from SDK',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createErrorRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Error reported',
      content: {
        'application/json': {
          schema: errorSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getErrorsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['error'],
  description: 'List errors for a specific session',
  security: [{ CookieAuth: [] }],
  request: {
    query: listErrorsQuerySchema,
  },
  responses: {
    200: {
      description: 'Errors list',
      content: {
        'application/json': {
          schema: errorsListResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const errorSdkRouter = new OpenAPIHono<{
  Variables: {
    apiKey: ApiKey;
    userId: string;
  };
}>();

errorSdkRouter.use('*', requireApiKey);

errorSdkRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['POST'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

const errorWebRouter = new OpenAPIHono<{
  Variables: {
    user: User;
    session: Session;
    apiKey: ApiKey;
  };
}>();

errorWebRouter.use('*', requireAuth, verifyApiKeyOwnership);

errorWebRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

errorSdkRouter.openapi(createErrorRoute, async (c) => {
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
          detail: 'Error timestamp cannot be before session startedAt',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const errorId = ulid();

    await addToQueue({
      type: 'error',
      errorId,
      sessionId: body.sessionId,
      message: body.message,
      errorType: body.type,
      stackTrace: body.stackTrace,
      timestamp: clientTimestamp.toISOString(),
    });

    return c.json(
      {
        errorId,
        sessionId: body.sessionId,
        message: body.message,
        type: body.type,
        stackTrace: body.stackTrace,
        timestamp: clientTimestamp.toISOString(),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Error.Create] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to report error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

errorWebRouter.openapi(getErrorsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const { sessionId, apiKeyId } = query;

    if (sessionId) {
      const sessionValidation = await validateSession(c, sessionId, apiKeyId);
      if (!sessionValidation.success) {
        return sessionValidation.response;
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

    let errorsList: (typeof errors.$inferSelect)[];
    let totalCount: number;

    if (sessionId) {
      const filters: SQL[] = [eq(errors.sessionId, sessionId)];

      if (query.type) {
        filters.push(eq(errors.type, query.type));
      }

      const whereClause = buildFilters({
        filters,
        startDateColumn: errors.timestamp,
        startDateValue: query.startDate,
        endDateColumn: errors.timestamp,
        endDateValue: query.endDate,
      });

      [errorsList, [{ count: totalCount }]] = await Promise.all([
        db
          .select()
          .from(errors)
          .where(whereClause)
          .orderBy(desc(errors.timestamp))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(errors).where(whereClause),
      ]);
    } else {
      const filters: SQL[] = [eq(devices.apiKeyId, apiKeyId)];

      if (query.type) {
        filters.push(eq(errors.type, query.type));
      }

      const whereClause = buildFilters({
        filters,
        startDateColumn: errors.timestamp,
        startDateValue: query.startDate,
        endDateColumn: errors.timestamp,
        endDateValue: query.endDate,
      });

      [errorsList, [{ count: totalCount }]] = await Promise.all([
        db
          .select({
            errorId: errors.errorId,
            sessionId: errors.sessionId,
            message: errors.message,
            type: errors.type,
            stackTrace: errors.stackTrace,
            timestamp: errors.timestamp,
          })
          .from(errors)
          .innerJoin(sessions, eq(errors.sessionId, sessions.sessionId))
          .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
          .where(whereClause)
          .orderBy(desc(errors.timestamp))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: count() })
          .from(errors)
          .innerJoin(sessions, eq(errors.sessionId, sessions.sessionId))
          .innerJoin(devices, eq(sessions.deviceId, devices.deviceId))
          .where(whereClause),
      ]);
    }

    const formattedErrors = errorsList.map((error) => ({
      errorId: error.errorId,
      sessionId: error.sessionId,
      message: error.message,
      type: error.type,
      stackTrace: error.stackTrace,
      timestamp: error.timestamp.toISOString(),
    }));

    return c.json(
      {
        errors: formattedErrors,
        pagination: formatPaginationResponse(totalCount, page, pageSize),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[Error.List] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to fetch errors',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export { errorSdkRouter, errorWebRouter };
