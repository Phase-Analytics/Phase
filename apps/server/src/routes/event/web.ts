import {
  ErrorCode,
  ErrorResponseSchema,
  EventOverviewResponseSchema,
  EventSchema,
  EventsListResponseSchema,
  EventTimeseriesResponseSchema,
  HttpStatus,
  TopEventsResponseSchema,
  TopScreensResponseSchema,
} from '@phase/shared';
import { Elysia, t } from 'elysia';
import { auth } from '@/lib/auth';
import {
  type App,
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import {
  getEventById,
  getEventStats,
  getEvents,
  getEventTimeseries,
  getTopEvents,
  getTopScreens,
} from '@/lib/questdb';
import {
  formatPaginationResponse,
  validateDateRange,
  validateDevice,
  validatePagination,
  validateSession,
} from '@/lib/validators';

type AuthContext = {
  user: BetterAuthUser;
  session: BetterAuthSession;
  store: { app: App };
};

export const eventWebRouter = new Elysia({ prefix: '/events' })
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
    '/',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const appId = query.appId as string;

        if (!appId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'appId is required',
          };
        }

        const sessionId = query.sessionId as string | undefined;
        const deviceId = query.deviceId as string | undefined;

        if (sessionId) {
          const sessionValidation = await validateSession(sessionId, appId);
          if (!sessionValidation.success) {
            set.status = sessionValidation.error.status;
            return {
              code: sessionValidation.error.code,
              detail: sessionValidation.error.detail,
            };
          }
        } else if (deviceId) {
          const deviceValidation = await validateDevice(deviceId, appId);
          if (!deviceValidation.success) {
            set.status = deviceValidation.error.status;
            return {
              code: deviceValidation.error.code,
              detail: deviceValidation.error.detail,
            };
          }
        }

        const paginationValidation = validatePagination(
          sessionId ? '1' : ((query.page as string) ?? '1'),
          sessionId ? '500' : ((query.pageSize as string) ?? '10'),
          sessionId ? Number.MAX_SAFE_INTEGER : undefined
        );
        if (!paginationValidation.success) {
          set.status = paginationValidation.error.status;
          return {
            code: paginationValidation.error.code,
            detail: paginationValidation.error.detail,
          };
        }

        const { page, pageSize, offset } = paginationValidation.data;

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

        const { events: eventsList, total: totalCount } = await getEvents({
          sessionId: sessionId || undefined,
          deviceId: deviceId || undefined,
          appId,
          eventName: (query.eventName as string) || undefined,
          startDate: (query.startDate as string) || undefined,
          endDate: (query.endDate as string) || undefined,
          limit: pageSize,
          offset,
        });

        const formattedEvents = eventsList.map((event) => {
          let timestamp: string;
          try {
            const parsed = new Date(event.timestamp);
            timestamp = Number.isNaN(parsed.getTime())
              ? new Date().toISOString()
              : parsed.toISOString();
          } catch {
            timestamp = new Date().toISOString();
          }

          return {
            eventId: event.event_id,
            name: event.name,
            deviceId: event.device_id,
            isScreen: Boolean(event.is_screen),
            timestamp,
          };
        });

        set.status = HttpStatus.OK;
        return {
          events: formattedEvents,
          pagination: formatPaginationResponse(totalCount, page, pageSize),
        };
      } catch (error) {
        console.error('[Event.List] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch events',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      query: t.Object({
        appId: t.String(),
        sessionId: t.Optional(t.String()),
        deviceId: t.Optional(t.String()),
        eventName: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
      response: {
        200: EventsListResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/top',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const appId = query.appId as string;
        const startDate = query.startDate as string | undefined;
        const endDate = query.endDate as string | undefined;

        if (!appId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'appId is required',
          };
        }

        const dateRangeValidation = validateDateRange(startDate, endDate);
        if (!dateRangeValidation.success) {
          set.status = dateRangeValidation.error.status;
          return {
            code: dateRangeValidation.error.code,
            detail: dateRangeValidation.error.detail,
          };
        }

        const { events, screens } = await getTopEvents({
          appId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit: 10,
        });

        set.status = HttpStatus.OK;
        return {
          events,
          screens,
          appId,
          startDate: startDate || null,
          endDate: endDate || null,
        };
      } catch (error) {
        console.error('[Event.TopEvents] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch top events',
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
        200: TopEventsResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/screens/top',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const appId = query.appId as string;
        const startDate = query.startDate as string | undefined;
        const endDate = query.endDate as string | undefined;

        if (!appId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'appId is required',
          };
        }

        const dateRangeValidation = validateDateRange(startDate, endDate);
        if (!dateRangeValidation.success) {
          set.status = dateRangeValidation.error.status;
          return {
            code: dateRangeValidation.error.code,
            detail: dateRangeValidation.error.detail,
          };
        }

        const topScreens = await getTopScreens({
          appId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit: 6,
        });

        set.status = HttpStatus.OK;
        return {
          screens: topScreens,
          appId,
          startDate: startDate || null,
          endDate: endDate || null,
        };
      } catch (error) {
        console.error('[Event.TopScreens] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch top screens',
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
        200: TopScreensResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/overview',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const appId = query.appId as string;

        if (!appId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'appId is required',
          };
        }

        const stats = await getEventStats({ appId });

        set.status = HttpStatus.OK;
        return stats;
      } catch (error) {
        console.error('[Event.Overview] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch event overview',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      query: t.Object({
        appId: t.String(),
      }),
      response: {
        200: EventOverviewResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/timeseries',
    async (ctx) => {
      const { query, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const appId = query.appId as string;
        const startDate = query.startDate as string | undefined;
        const endDate = query.endDate as string | undefined;

        if (!appId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'appId is required',
          };
        }

        const dateRangeValidation = validateDateRange(startDate, endDate);
        if (!dateRangeValidation.success) {
          set.status = dateRangeValidation.error.status;
          return {
            code: dateRangeValidation.error.code,
            detail: dateRangeValidation.error.detail,
          };
        }

        const result = await getEventTimeseries({
          appId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        set.status = HttpStatus.OK;
        return result;
      } catch (error) {
        console.error('[Event.Timeseries] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch event timeseries',
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
        200: EventTimeseriesResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .get(
    '/:eventId',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const { eventId } = params;
        const appId = query.appId as string;

        if (!appId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.VALIDATION_ERROR,
            detail: 'appId is required',
          };
        }

        const event = await getEventById({ eventId, appId });

        if (!event) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'Event not found',
          };
        }

        let parsedParams: Record<
          string,
          string | number | boolean | null
        > | null = null;
        if (event.params) {
          try {
            parsedParams = JSON.parse(event.params);
          } catch (error) {
            console.error(
              `[Event.Get] Failed to parse params for event ${event.event_id}:`,
              error
            );
            parsedParams = null;
          }
        }

        let timestamp: string;
        try {
          const parsed = new Date(event.timestamp);
          timestamp = Number.isNaN(parsed.getTime())
            ? new Date().toISOString()
            : parsed.toISOString();
        } catch {
          timestamp = new Date().toISOString();
        }

        set.status = HttpStatus.OK;
        return {
          eventId: event.event_id,
          sessionId: event.session_id,
          deviceId: event.device_id,
          name: event.name,
          params: parsedParams,
          isScreen: event.is_screen,
          timestamp,
        };
      } catch (error) {
        console.error('[Event.Get] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch event',
        };
      }
    },
    {
      requireAuth: true,
      verifyAppAccess: true,
      params: t.Object({
        eventId: t.String(),
      }),
      query: t.Object({
        appId: t.String(),
      }),
      response: {
        200: EventSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
