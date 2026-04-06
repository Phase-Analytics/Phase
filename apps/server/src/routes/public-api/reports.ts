import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  PublicApiDeviceBreakdownResponseSchema,
  PublicApiDeviceOverviewResponseSchema,
  PublicApiDeviceTimeseriesResponseSchema,
  PublicApiEventBreakdownResponseSchema,
  PublicApiEventOverviewResponseSchema,
  PublicApiEventTimeseriesResponseSchema,
  PublicApiSessionOverviewResponseSchema,
  PublicApiSessionTimeseriesResponseSchema,
} from '@phase/shared';
import { Elysia, t } from 'elysia';
import { publicApiAuthPlugin } from '@/lib/public-api-auth';
import { getPublicApiMeta } from '@/lib/public-api-capabilities';
import {
  getPublicDeviceBreakdown,
  getPublicDeviceOverview,
  getPublicDeviceTimeseries,
  getPublicEventBreakdown,
  getPublicEventOverview,
  getPublicEventTimeseries,
  getPublicSessionOverview,
  getPublicSessionTimeseries,
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
    '/devices/overview',
    async ({ params, set }) => {
      try {
        const result = await getPublicDeviceOverview(params.appId);
        set.status = HttpStatus.OK;
        return {
          ...result,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Devices.Overview] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch device overview',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      response: {
        200: PublicApiDeviceOverviewResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/devices/timeseries',
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

        const metric = query.metric ?? 'activeDevices';
        const result = await getPublicDeviceTimeseries({
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
        console.error('[PublicAPI.Devices.Timeseries] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch device timeseries',
        };
      }
    },
    {
      params: t.Object({ appId: t.String() }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        metric: t.Optional(
          t.Union([t.Literal('activeDevices'), t.Literal('totalDevices')])
        ),
      }),
      response: {
        200: PublicApiDeviceTimeseriesResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/devices/breakdown',
    async ({ params, query, set }) => {
      try {
        const rows = await getPublicDeviceBreakdown({
          appId: params.appId,
          dimension: query.dimension,
          limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
        });

        set.status = HttpStatus.OK;
        return {
          dimension: query.dimension,
          metric: 'deviceCount',
          rows,
          meta: getPublicApiMeta(),
        };
      } catch (error) {
        console.error('[PublicAPI.Devices.Breakdown] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch device breakdown',
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
        200: PublicApiDeviceBreakdownResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
