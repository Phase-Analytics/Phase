import { randomUUID } from 'node:crypto';
import {
  CreateFunnelDefinitionRequestSchema,
  CustomFunnelRunRequestSchema,
  ErrorCode,
  ErrorResponseSchema,
  type FunnelCustomStep,
  FunnelCustomStepSchema,
  FunnelDefinitionSchema,
  FunnelDefinitionsListResponseSchema,
  FunnelResultSchema,
  HttpStatus,
  UpdateFunnelDefinitionRequestSchema,
} from '@phase/shared';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { apps, db, funnelPresets } from '@/db';
import { auth } from '@/lib/auth';
import {
  resolveFunnelPeriod,
  runActivationFunnel,
  runCustomFunnel,
} from '@/lib/funnels';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import { validateDateRange } from '@/lib/validators';

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

function normalizeFunnelSteps(steps: unknown): FunnelCustomStep[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      return FunnelCustomStepSchema.parse({ kind: 'event', name: 'unknown' });
    }

    const step = raw as {
      kind?: string;
      name?: string;
    };

    if (step.kind === 'first_seen' || step.kind === 'session') {
      return FunnelCustomStepSchema.parse({ kind: step.kind });
    }

    if (
      step.kind === 'session_30s' ||
      step.kind === 'session_10m' ||
      step.kind === 'engaged_10m' ||
      step.kind === 'return_d1' ||
      step.kind === 'return_d3'
    ) {
      return FunnelCustomStepSchema.parse({ kind: step.kind });
    }

    return FunnelCustomStepSchema.parse({
      kind: 'event',
      name: step.name ?? 'unknown',
    });
  });
}

function mapFunnelRow(row: typeof funnelPresets.$inferSelect) {
  return {
    id: row.id,
    appId: row.appId,
    name: row.name,
    steps: normalizeFunnelSteps(row.steps),
    windowHours: row.windowHours,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const funnelWebRouter = new Elysia({ prefix: '/funnels' })
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
  .get(
    '/activation',
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

      const dateRangeValidation = validateDateRange(
        query.startDate as string | undefined,
        query.endDate as string | undefined
      );
      if (!dateRangeValidation.success) {
        set.status = dateRangeValidation.error.status;
        return {
          code: dateRangeValidation.error.code,
          detail: dateRangeValidation.error.detail,
        };
      }

      try {
        const period = resolveFunnelPeriod(
          query.startDate as string | undefined,
          query.endDate as string | undefined
        );
        return await runActivationFunnel(appId, period);
      } catch (error) {
        console.error('[Funnel.Activation] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to compute activation funnel',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      query: t.Object({
        appId: t.String(),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
      response: {
        200: FunnelResultSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
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

      const parsed = CustomFunnelRunRequestSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: parsed.error.message,
        };
      }

      const app = await assertAppAccess(parsed.data.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return {
          code: ErrorCode.FORBIDDEN,
          detail: 'App not found or access denied',
        };
      }

      const dateRangeValidation = validateDateRange(
        parsed.data.startDate,
        parsed.data.endDate
      );
      if (!dateRangeValidation.success) {
        set.status = dateRangeValidation.error.status;
        return {
          code: dateRangeValidation.error.code,
          detail: dateRangeValidation.error.detail,
        };
      }

      try {
        const period = resolveFunnelPeriod(
          parsed.data.startDate,
          parsed.data.endDate
        );
        return await runCustomFunnel(
          parsed.data.appId,
          parsed.data.steps,
          period,
          parsed.data.windowHours
        );
      } catch (error) {
        console.error('[Funnel.Run] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to compute custom funnel',
        };
      }
    },
    {
      body: CustomFunnelRunRequestSchema,
      response: {
        200: FunnelResultSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
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
        .from(funnelPresets)
        .where(eq(funnelPresets.appId, appId))
        .orderBy(desc(funnelPresets.updatedAt));

      return {
        funnels: rows.map(mapFunnelRow),
      };
    },
    {
      query: t.Object({ appId: t.String() }),
      response: {
        200: FunnelDefinitionsListResponseSchema,
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

      const parsed = CreateFunnelDefinitionRequestSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: parsed.error.message,
        };
      }

      const app = await assertAppAccess(parsed.data.appId, user.id);
      if (!app) {
        set.status = HttpStatus.FORBIDDEN;
        return {
          code: ErrorCode.FORBIDDEN,
          detail: 'App not found or access denied',
        };
      }

      const steps = parsed.data.steps.map((step) =>
        FunnelCustomStepSchema.parse(step)
      );
      const id = randomUUID();
      const now = new Date();

      await db.insert(funnelPresets).values({
        id,
        appId: parsed.data.appId,
        name: parsed.data.name,
        steps,
        windowHours: parsed.data.windowHours,
        createdByUserId: user.id,
        createdAt: now,
        updatedAt: now,
      });

      return {
        id,
        appId: parsed.data.appId,
        name: parsed.data.name,
        steps,
        windowHours: parsed.data.windowHours,
        createdByUserId: user.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    },
    {
      body: CreateFunnelDefinitionRequestSchema,
      response: {
        200: FunnelDefinitionSchema,
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

      const existing = await db.query.funnelPresets.findFirst({
        where: eq(funnelPresets.id, params.id),
      });

      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return {
          code: ErrorCode.NOT_FOUND,
          detail: 'Funnel not found',
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

      const parsed = UpdateFunnelDefinitionRequestSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HttpStatus.BAD_REQUEST;
        return {
          code: ErrorCode.VALIDATION_ERROR,
          detail: parsed.error.message,
        };
      }

      const updates: Partial<typeof funnelPresets.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (parsed.data.name !== undefined) {
        updates.name = parsed.data.name;
      }
      if (parsed.data.steps !== undefined) {
        updates.steps = parsed.data.steps.map((step) =>
          FunnelCustomStepSchema.parse(step)
        );
      }
      if (parsed.data.windowHours !== undefined) {
        updates.windowHours = parsed.data.windowHours;
      }

      const [updated] = await db
        .update(funnelPresets)
        .set(updates)
        .where(eq(funnelPresets.id, params.id))
        .returning();

      return mapFunnelRow(updated);
    },
    {
      body: UpdateFunnelDefinitionRequestSchema,
      response: {
        200: FunnelDefinitionSchema,
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

      const existing = await db.query.funnelPresets.findFirst({
        where: eq(funnelPresets.id, params.id),
      });

      if (!existing) {
        set.status = HttpStatus.NOT_FOUND;
        return {
          code: ErrorCode.NOT_FOUND,
          detail: 'Funnel not found',
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

      await db.delete(funnelPresets).where(eq(funnelPresets.id, params.id));
      set.status = HttpStatus.NO_CONTENT;
      return;
    },
    {
      response: {
        204: t.Void(),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  );
