import {
  ErrorCode,
  ErrorResponseSchema,
  FunnelCustomStepSchema,
  HttpStatus,
  PublicApiFunnelListResponseSchema,
  PublicApiFunnelResultSchema,
  PublicApiFunnelRunRequestSchema,
} from '@phase/shared';
import { and, desc, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db, funnelPresets } from '@/db';
import {
  resolveFunnelPeriod,
  runActivationFunnel,
  runCustomFunnel,
} from '@/lib/funnels';
import { publicApiAuthPlugin } from '@/lib/public-api-auth';
import { getPublicApiMeta } from '@/lib/public-api-capabilities';
import { validatePublicReportDateRange } from '@/lib/public-api-reports';

function normalizeFunnelSteps(steps: unknown) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      return FunnelCustomStepSchema.parse({ kind: 'event', name: 'unknown' });
    }

    const step = raw as { kind?: string; name?: string };

    if (
      step.kind === 'first_seen' ||
      step.kind === 'session' ||
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

export const publicApiFunnelsRouter = new Elysia({
  prefix: '/v1/apps/:appId/reports/funnels',
})
  .use(publicApiAuthPlugin)
  .get(
    '/activation',
    async ({ params, query, set }) => {
      try {
        const dateValidation = validatePublicReportDateRange(
          query.startDate,
          query.endDate
        );
        if (!dateValidation.success) {
          set.status = dateValidation.error.status;
          return {
            code: dateValidation.error.code,
            detail: dateValidation.error.detail,
          };
        }

        const period = resolveFunnelPeriod(query.startDate, query.endDate);
        const result = await runActivationFunnel(params.appId, period);

        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Funnels.Activation] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch activation funnel',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
      response: {
        200: PublicApiFunnelResultSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/',
    async ({ params, set }) => {
      try {
        const rows = await db
          .select()
          .from(funnelPresets)
          .where(eq(funnelPresets.appId, params.appId))
          .orderBy(desc(funnelPresets.updatedAt));

        set.status = HttpStatus.OK;
        return {
          funnels: rows.map((row) => ({
            id: row.id,
            name: row.name,
            steps: normalizeFunnelSteps(row.steps),
            windowHours: row.windowHours,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          })),
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Funnels.List] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to list funnels',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      response: {
        200: PublicApiFunnelListResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .post(
    '/run',
    async ({ params, body, set }) => {
      try {
        const parsed = PublicApiFunnelRunRequestSchema.safeParse(body);
        if (!parsed.success) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: parsed.error.message,
          };
        }

        const dateValidation = validatePublicReportDateRange(
          parsed.data.startDate,
          parsed.data.endDate
        );
        if (!dateValidation.success) {
          set.status = dateValidation.error.status;
          return {
            code: dateValidation.error.code,
            detail: dateValidation.error.detail,
          };
        }

        const steps = parsed.data.steps.map((step) =>
          FunnelCustomStepSchema.parse(step)
        );
        const period = resolveFunnelPeriod(
          parsed.data.startDate,
          parsed.data.endDate
        );
        const result = await runCustomFunnel(
          params.appId,
          steps,
          period,
          parsed.data.windowHours
        );

        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Funnels.Run] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to run custom funnel',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      body: PublicApiFunnelRunRequestSchema,
      response: {
        200: PublicApiFunnelResultSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/:funnelId',
    async ({ params, query, set }) => {
      try {
        const dateValidation = validatePublicReportDateRange(
          query.startDate,
          query.endDate
        );
        if (!dateValidation.success) {
          set.status = dateValidation.error.status;
          return {
            code: dateValidation.error.code,
            detail: dateValidation.error.detail,
          };
        }

        const existing = await db.query.funnelPresets.findFirst({
          where: and(
            eq(funnelPresets.id, params.funnelId),
            eq(funnelPresets.appId, params.appId)
          ),
        });

        if (!existing) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'Funnel not found',
          };
        }

        const period = resolveFunnelPeriod(query.startDate, query.endDate);
        const result = await runCustomFunnel(
          params.appId,
          normalizeFunnelSteps(existing.steps),
          period,
          existing.windowHours
        );

        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Funnels.Get] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch funnel',
        };
      }
    },
    {
      params: t.Object({ appId: t.String(), funnelId: t.String() }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
      response: {
        200: PublicApiFunnelResultSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
