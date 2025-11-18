import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { eq, or, sql } from 'drizzle-orm';
import { apps, db } from '@/db';
import type { Session, User } from '@/db/schema';
import { generateAppId, generateAppKey } from '@/lib/keys';
import { requireAuth } from '@/lib/middleware';
import { methodNotAllowed } from '@/lib/response';
import {
  appCreatedSchema,
  appKeysResponseSchema,
  appsListResponseSchema,
  appTeamResponseSchema,
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

const getAppKeysRoute = createRoute({
  method: 'get',
  path: '/:id/keys',
  tags: ['app'],
  description: 'Get app API keys',
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: 'App keys',
      content: {
        'application/json': {
          schema: appKeysResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const getAppTeamRoute = createRoute({
  method: 'get',
  path: '/:id/team',
  tags: ['app'],
  description: 'Get app team members',
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: 'App team',
      content: {
        'application/json': {
          schema: appTeamResponseSchema,
        },
      },
    },
    ...errorResponses,
  },
});

const deleteAppRoute = createRoute({
  method: 'delete',
  path: '/:id',
  tags: ['app'],
  description: 'Delete app (owner only)',
  security: [{ CookieAuth: [] }],
  responses: {
    204: {
      description: 'App deleted successfully',
    },
    ...errorResponses,
  },
});

const rotateAppKeyRoute = createRoute({
  method: 'post',
  path: '/:id/keys/rotate',
  tags: ['app'],
  description: 'Rotate app API key (owner only)',
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: 'New API key',
      content: {
        'application/json': {
          schema: appKeysResponseSchema,
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
  const allowedMethods = ['GET', 'POST', 'DELETE'];

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

    const accessibleApps = await db.query.apps.findMany({
      where: or(
        eq(apps.userId, user.id),
        sql`${user.id} = ANY(${apps.memberIds})`
      ),
      columns: {
        id: true,
        name: true,
      },
      orderBy: (appsTable, { desc }) => [desc(appsTable.createdAt)],
    });

    return c.json(
      {
        apps: accessibleApps,
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
appWebRouter.openapi(getAppKeysRoute, async (c: any) => {
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
      where: (table, { eq: eqFn }) => eqFn(table.id, id),
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

    const hasAccess =
      app.userId === user.id || app.memberIds?.includes(user.id);

    if (!hasAccess) {
      return c.json(
        {
          code: ErrorCode.FORBIDDEN,
          detail: 'Access denied',
        },
        HttpStatus.FORBIDDEN
      );
    }

    return c.json(
      {
        key: app.key,
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[App.GetKeys] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to get app keys',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
appWebRouter.openapi(getAppTeamRoute, async (c: any) => {
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
      where: (table, { eq: eqFn }) => eqFn(table.id, id),
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

    const hasAccess =
      app.userId === user.id || app.memberIds?.includes(user.id);

    if (!hasAccess) {
      return c.json(
        {
          code: ErrorCode.FORBIDDEN,
          detail: 'Access denied',
        },
        HttpStatus.FORBIDDEN
      );
    }

    const owner = await db.query.user.findFirst({
      where: (table, { eq: eqFn }) => eqFn(table.id, app.userId),
      columns: {
        id: true,
        email: true,
      },
    });

    if (!owner) {
      return c.json(
        {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Owner not found',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const memberUsers = await db.query.user.findMany({
      where: (table, { inArray }) => inArray(table.id, app.memberIds || []),
      columns: {
        id: true,
        email: true,
      },
    });

    return c.json(
      {
        owner: {
          userId: owner.id,
          email: owner.email,
        },
        members: memberUsers.map((member) => ({
          userId: member.id,
          email: member.email,
        })),
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[App.GetTeam] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to get app team',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
appWebRouter.openapi(deleteAppRoute, async (c: any) => {
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
      where: (table, { eq: eqFn }) => eqFn(table.id, id),
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

    if (app.userId !== user.id) {
      return c.json(
        {
          code: ErrorCode.FORBIDDEN,
          detail: 'Only the app owner can delete the app',
        },
        HttpStatus.FORBIDDEN
      );
    }

    await db.delete(apps).where(eq(apps.id, id));

    return c.body(null, HttpStatus.NO_CONTENT);
  } catch (error) {
    console.error('[App.Delete] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to delete app',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI handler type inference issue with union response types
appWebRouter.openapi(rotateAppKeyRoute, async (c: any) => {
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
      where: (table, { eq: eqFn }) => eqFn(table.id, id),
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

    if (app.userId !== user.id) {
      return c.json(
        {
          code: ErrorCode.FORBIDDEN,
          detail: 'Only the app owner can rotate the API key',
        },
        HttpStatus.FORBIDDEN
      );
    }

    const newKey = generateAppKey();

    await db.update(apps).set({ key: newKey }).where(eq(apps.id, id));

    return c.json(
      {
        key: newKey,
      },
      HttpStatus.OK
    );
  } catch (error) {
    console.error('[App.RotateKey] Error:', error);
    return c.json(
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        detail: 'Failed to rotate app key',
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
});

export { appWebRouter };
