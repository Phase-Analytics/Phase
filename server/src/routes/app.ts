import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { apps, db } from '@/db';
import type { Session, User } from '@/db/schema';
import { generateAppId, generateAppKey } from '@/lib/keys';
import { requireAuth } from '@/lib/middleware';
import { methodNotAllowed } from '@/lib/response';
import {
  appCreatedSchema,
  appDetailSchema,
  appsListResponseSchema,
  createAppRequestSchema,
  ErrorCode,
  errorResponses,
  HttpStatus,
} from '@/schemas';

const createAppRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['app'],
  description: 'Create a new app',
  security: [{ CookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createAppRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'App created successfully',
      content: {
        'application/json': {
          schema: appCreatedSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const listAppsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['app'],
  description: 'List all apps for the authenticated user',
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: 'Apps list',
      content: {
        'application/json': {
          schema: appsListResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getAppRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['app'],
  description: 'Get app details with key',
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: 'App details',
      content: {
        'application/json': {
          schema: appDetailSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const appWebRouter = new OpenAPIHono<{
  Variables: {
    user: User;
    session: Session;
  };
}>();

appWebRouter.use('*', requireAuth);

appWebRouter.all('*', async (c, next) => {
  const method = c.req.method;
  const allowedMethods = ['GET', 'POST'];

  if (!allowedMethods.includes(method)) {
    return methodNotAllowed(c, allowedMethods);
  }

  return await next();
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
appWebRouter.openapi(createAppRoute, async (c: any) => {
  try {
    const body = c.req.valid('json');
    const user = c.get('user');

    if (!user?.id) {
      return c.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'User authentication required',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    const appId = generateAppId();
    const appKey = generateAppKey();

    const [newApp] = await db
      .insert(apps)
      .values({
        id: appId,
        userId: user.id,
        name: body.name,
        image: body.image ?? null,
        key: appKey,
      })
      .returning();

    return c.json(
      {
        id: newApp.id,
        name: newApp.name,
        image: newApp.image,
        createdAt: newApp.createdAt.toISOString(),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[App.Create] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to create app',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
appWebRouter.openapi(listAppsRoute, async (c: any) => {
  try {
    const user = c.get('user');

    if (!user?.id) {
      return c.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'User authentication required',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    const userApps = await db.query.apps.findMany({
      where: eq(apps.userId, user.id),
      columns: {
        id: true,
        name: true,
        image: true,
      },
      orderBy: (appsTable, { desc }) => [desc(appsTable.createdAt)],
    });

    return c.json(
      {
        apps: userApps,
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[App.List] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to list apps',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
appWebRouter.openapi(getAppRoute, async (c: any) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    if (!user?.id) {
      return c.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'User authentication required',
        },
        HttpStatus.UNAUTHORIZED
      );
    }

    const app = await db.query.apps.findFirst({
      where: (table, { eq: eqFn, and: andFn }) =>
        andFn(eqFn(table.id, id), eqFn(table.userId, user.id)),
    });

    if (!app) {
      return c.json(
        {
          code: ErrorCode.NOT_FOUND,
          detail: 'App not found',
        },
        HttpStatus.NOT_FOUND
      );
    }

    return c.json(
      {
        id: app.id,
        name: app.name,
        image: app.image,
        key: app.key,
        createdAt: app.createdAt.toISOString(),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[App.Get] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to get app',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export { appWebRouter };
