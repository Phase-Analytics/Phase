import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  PublicApiEventBreakdownResponseSchema,
  PublicApiEventOverviewResponseSchema,
  PublicApiEventTimeseriesResponseSchema,
  PublicApiSessionBreakdownResponseSchema,
  PublicApiSessionOverviewResponseSchema,
  PublicApiSessionTimeseriesResponseSchema,
  PublicApiUserBreakdownResponseSchema,
  PublicApiUserOverviewResponseSchema,
  PublicApiUserTimeseriesResponseSchema,
} from '@phase/shared';
import { Elysia, t } from 'elysia';
import { publicApiAuthPlugin } from '@/lib/public-api-auth';
import { getPublicApiMeta } from '@/lib/public-api-capabilities';
import {
  getPublicEventBreakdown,
  getPublicEventOverview,
  getPublicEventTimeseries,
  getPublicSessionBreakdown,
  getPublicSessionOverview,
  getPublicSessionTimeseries,
  getPublicUserBreakdown,
  getPublicUserOverview,
  getPublicUserTimeseries,
  validatePublicReportDateRange,
} from '@/lib/public-api-reports';

export const publicApiReportsRouter = new Elysia({
  prefix: '/v1/apps/:appId/reports',
})
  .use(publicApiAuthPlugin)
  .get(
    '/events/overview',
    async ({ params, set }) => {
      try {
        const result = await getPublicEventOverview(params.appId);
        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Events.Overview] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch event overview',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      response: {
        200: PublicApiEventOverviewResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/events/timeseries',
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

        const result = await getPublicEventTimeseries({
          appId: params.appId,
          startDate: query.startDate,
          endDate: query.endDate,
        });

        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Events.Timeseries] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch event timeseries',
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
        200: PublicApiEventTimeseriesResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/events/breakdown',
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

        const rows = await getPublicEventBreakdown({
          appId: params.appId,
          dimension: query.dimension,
          startDate: query.startDate,
          endDate: query.endDate,
          limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
        });

        set.status = HttpStatus.OK;
        return {
          dimension: query.dimension,
          metric: 'eventCount',
          rows,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Events.Breakdown] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch event breakdown',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      query: t.Object({
        dimension: t.Union([t.Literal('eventName'), t.Literal('screenName')]),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      response: {
        200: PublicApiEventBreakdownResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/sessions/overview',
    async ({ params, set }) => {
      try {
        const result = await getPublicSessionOverview(params.appId);
        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Sessions.Overview] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch session overview',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      response: {
        200: PublicApiSessionOverviewResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/sessions/timeseries',
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

        const metric = query.metric ?? 'sessionCount';
        const result = await getPublicSessionTimeseries({
          appId: params.appId,
          startDate: query.startDate,
          endDate: query.endDate,
          metric,
        });

        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Sessions.Timeseries] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch session timeseries',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        metric: t.Optional(
          t.Union([
            t.Literal('sessionCount'),
            t.Literal('avgSessionDuration'),
            t.Literal('bounceRate'),
          ])
        ),
      }),
      response: {
        200: PublicApiSessionTimeseriesResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/sessions/breakdown',
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

        const rows = await getPublicSessionBreakdown({
          appId: params.appId,
          dimension: query.dimension,
          startDate: query.startDate,
          endDate: query.endDate,
          limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
        });

        set.status = HttpStatus.OK;
        return {
          dimension: query.dimension,
          metric: 'sessionCount',
          rows,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Sessions.Breakdown] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch session breakdown',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      query: t.Object({
        dimension: t.Union([
          t.Literal('platform'),
          t.Literal('country'),
          t.Literal('city'),
        ]),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      response: {
        200: PublicApiSessionBreakdownResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/users/overview',
    async ({ params, set }) => {
      try {
        const result = await getPublicUserOverview(params.appId);
        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Users.Overview] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch user overview',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      response: {
        200: PublicApiUserOverviewResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/users/timeseries',
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

        const metric = query.metric ?? 'activeUsers';
        const result = await getPublicUserTimeseries({
          appId: params.appId,
          startDate: query.startDate,
          endDate: query.endDate,
          metric,
        });

        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Users.Timeseries] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch user timeseries',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        metric: t.Optional(
          t.Union([
            t.Literal('activeUsers'),
            t.Literal('totalUsers'),
            t.Literal('newUsers'),
          ])
        ),
      }),
      response: {
        200: PublicApiUserTimeseriesResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/users/breakdown',
    async ({ params, query, set }) => {
      try {
        const rows = await getPublicUserBreakdown({
          appId: params.appId,
          dimension: query.dimension,
          limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
        });

        set.status = HttpStatus.OK;
        return {
          dimension: query.dimension,
          metric: 'userCount',
          rows,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Users.Breakdown] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch user breakdown',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      query: t.Object({
        dimension: t.Union([
          t.Literal('platform'),
          t.Literal('country'),
          t.Literal('city'),
        ]),
        limit: t.Optional(t.String()),
      }),
      response: {
        200: PublicApiUserBreakdownResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
