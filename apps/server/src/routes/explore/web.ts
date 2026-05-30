import { randomUUID } from 'node:crypto';
import {
  CreateExplorePresetRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  ExploreCatalogResponseSchema,
  ExploreGenerateQueryRequestSchema,
  ExploreGenerateQueryResponseSchema,
  ExplorePresetSchema,
  ExplorePresetsListResponseSchema,
  ExploreQueryV1Schema,
  ExploreRunRequestSchema,
  ExploreRunResponseSchema,
  HttpStatus,
  UpdateExplorePresetRequestSchema,
} from '@phase/shared';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { apps, db, explorePresets } from '@/db';
import { auth } from '@/lib/auth';
import {
  ExploreAiError,
  ExploreEngineError,
  generateExploreQueryFromPrompt,
  getExploreCatalog,
  runExploreQuery,
} from '@/lib/explore';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import { checkExploreAiGenerateRateLimit } from '@/lib/rate-limit';

type AuthContext = {
  user: BetterAuthUser;
  session: BetterAuthSession;
};

async function assertAppAccess(appId: string, userId: string) {
  const app = await db.query.apps.findFirst({
    where: and(
      eq(apps.id, appId),
      or(eq(apps.userId, userId), sql`${userId} = ANY(${apps.memberIds})`)
    ),
  });

  if (!app) {
    return null;
  }

  return app;
}

export const exploreWebRouter = new Elysia({ prefix: '/explore' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return {
      user: session?.user as BetterAuthUser,
      session: session?.session as BetterAuthSession,
    };
  })
  .use(authPlugin)
  .post(
    '/run',
    async (ctx) => {
      const { body, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(body.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return {
          code: ErrorCode.FORBIDDEN,
          detail: 'App not found or access denied',
        };
      }

      const parsed = ExploreQueryV1Schema.safeParse(body.query);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: parsed.error.message,
        };
      }

      try {
        return await runExploreQuery(body.appId, parsed.data);
      } catch (error) {
        if (error instanceof ExploreEngineError) {
          set.status = error.statusCode;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: error.message,
          };
        }
        console.error('[Explore.Run] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to run explore query',
        };
      }
    },
    {
      body: ExploreRunRequestSchema,
      response: {
        200: ExploreRunResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .post(
    '/generate-query',
    async (ctx) => {
      const { body, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(body.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return {
          code: ErrorCode.FORBIDDEN,
          detail: 'App not found or access denied',
        };
      }

      const rateLimit = await checkExploreAiGenerateRateLimit(user.id);
      if (!rateLimit.allowed) {
        set.status = HttpStatus.TOO_MANY_REQUESTS;
        return {
          code: ErrorCode.TOO_MANY_REQUESTS,
          detail: rateLimit.reason ?? 'Too many AI query requests',
        };
      }

      try {
        return await generateExploreQueryFromPrompt(body.appId, body.prompt);
      } catch (error) {
        if (error instanceof ExploreAiError) {
          set.status = error.statusCode;
          return {
            code:
              error.statusCode === HttpStatus.TOO_MANY_REQUESTS
                ? ErrorCode.TOO_MANY_REQUESTS
                : ErrorCode.VALIDATION_ERROR,
            detail: error.message,
          };
        }
        console.error('[Explore.GenerateQuery] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to generate explore query',
        };
      }
    },
    {
      body: ExploreGenerateQueryRequestSchema,
      response: {
        200: ExploreGenerateQueryResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        429: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/catalog',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const appId = query.appId as string;
      const app = await assertAppAccess(appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return {
          code: ErrorCode.FORBIDDEN,
          detail: 'App not found or access denied',
        };
      }

      const eventName = query.eventName as string | undefined;
      return await getExploreCatalog(appId, eventName);
    },
    {
      query: t.Object({
        appId: t.String(),
        eventName: t.Optional(t.String()),
      }),
      response: {
        200: ExploreCatalogResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/presets',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const appId = query.appId as string;
      const app = await assertAppAccess(appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return {
          code: ErrorCode.FORBIDDEN,
          detail: 'App not found or access denied',
        };
      }

      const rows = await db
        .select()
        .from(explorePresets)
        .where(eq(explorePresets.appId, appId))
        .orderBy(desc(explorePresets.updatedAt));

      return {
        presets: rows.map((row) => ({
          id: row.id,
          appId: row.appId,
          name: row.name,
          query: ExploreQueryV1Schema.parse(row.query),
          summary: row.summary,
          createdByUserId: row.createdByUserId,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
      };
    },
    {
      query: t.Object({ appId: t.String() }),
      response: {
        200: ExplorePresetsListResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
      },
    }
  )
  .post(
    '/presets',
    async (ctx) => {
      const { body, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const app = await assertAppAccess(body.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return {
          code: ErrorCode.FORBIDDEN,
          detail: 'App not found or access denied',
        };
      }

      const parsed = ExploreQueryV1Schema.safeParse(body.query);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: parsed.error.message,
        };
      }

      const id = randomUUID();
      const now = new Date();

      await db.insert(explorePresets).values({
        id,
        appId: body.appId,
        name: body.name,
        query: parsed.data,
        summary: body.summary ?? null,
        createdByUserId: user.id,
        createdAt: now,
        updatedAt: now,
      });

      return {
        id,
        appId: body.appId,
        name: body.name,
        query: parsed.data,
        summary: body.summary ?? null,
        createdByUserId: user.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    },
    {
      body: CreateExplorePresetRequestSchema,
      response: {
        200: ExplorePresetSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
      },
    }
  )
  .patch(
    '/presets/:id',
    async (ctx) => {
      const { params, body, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const existing = await db.query.explorePresets.findFirst({
        where: eq(explorePresets.id, params.id),
      });

      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return {
          code: ErrorCode.NOT_FOUND,
          detail: 'Preset not found',
        };
      }

      const app = await assertAppAccess(existing.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return {
          code: ErrorCode.FORBIDDEN,
          detail: 'App not found or access denied',
        };
      }

      const updates: Partial<typeof explorePresets.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (body.name) {
        updates.name = body.name;
      }

      if (body.query) {
        const parsed = ExploreQueryV1Schema.safeParse(body.query);
        if (!parsed.success) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: parsed.error.message,
          };
        }
        updates.query = parsed.data;
      }

      if (body.summary !== undefined) {
        updates.summary = body.summary;
      }

      const [row] = await db
        .update(explorePresets)
        .set(updates)
        .where(eq(explorePresets.id, params.id))
        .returning();

      return {
        id: row.id,
        appId: row.appId,
        name: row.name,
        query: ExploreQueryV1Schema.parse(row.query),
        summary: row.summary,
        createdByUserId: row.createdByUserId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: UpdateExplorePresetRequestSchema,
      response: {
        200: ExplorePresetSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  )
  .delete(
    '/presets/:id',
    async (ctx) => {
      const { params, user, set } = ctx as typeof ctx & AuthContext;

      if (!user?.id) {
        set.status = HttpStatus.UNAUTHORIZED;
        return {
          code: ErrorCode.UNAUTHORIZED,
          detail: 'Authentication required',
        };
      }

      const existing = await db.query.explorePresets.findFirst({
        where: eq(explorePresets.id, params.id),
      });

      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return {
          code: ErrorCode.NOT_FOUND,
          detail: 'Preset not found',
        };
      }

      const app = await assertAppAccess(existing.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return {
          code: ErrorCode.FORBIDDEN,
          detail: 'App not found or access denied',
        };
      }

      await db.delete(explorePresets).where(eq(explorePresets.id, params.id));

      set.status = HttpStatus.NO_CONTENT;
      return null;
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        204: t.Null(),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  );
