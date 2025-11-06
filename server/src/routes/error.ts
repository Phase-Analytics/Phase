import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { ulid } from 'ulid';
import type { App, Session, User } from '@/db/schema';
import {
  requireAppKey,
  requireAuth,
  verifyAppOwnership,
} from '@/lib/middleware';
import { getErrors, writeError } from '@/lib/questdb';
import { methodNotAllowed } from '@/lib/response';
import {
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
    app: App;
    userId: string;
  };
}>();

errorSdkRouter.use('*', requireAppKey);

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
    app: App;
  };
}>();

errorWebRouter.use('*', requireAuth, verifyAppOwnership);

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
          detail: 'Error timestamp cannot be before session startedAt',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const errorId = ulid();

    await writeError({
      errorId,
      sessionId: body.sessionId,
      deviceId: session.deviceId,
      appId: device.appId,
      message: body.message,
      type: body.type,
      stackTrace: body.stackTrace ?? null,
      timestamp: clientTimestamp,
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
    const { sessionId, appId } = query;

    if (sessionId) {
      const sessionValidation = await validateSession(c, sessionId, appId);
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

    const { errors: errorsList, total: totalCount } = await getErrors({
      sessionId: sessionId || undefined,
      appId,
      errorType: query.type || undefined,
      startDate: query.startDate || undefined,
      endDate: query.endDate || undefined,
      limit: pageSize,
      offset,
    });

    const formattedErrors = errorsList.map((error) => ({
      errorId: error.error_id,
      sessionId: error.session_id,
      message: error.message,
      type: error.type,
      stackTrace: error.stack_trace,
      timestamp: new Date(error.timestamp).toISOString(),
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
