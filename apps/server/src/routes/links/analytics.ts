import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  LINK_ANALYTICS_DEFAULT_RANGE,
  LinkAnalyticsRangeSchema,
  LinkAnalyticsResponseSchema,
  LinkClicksListResponseSchema,
} from '@phase/shared';
import { t } from 'elysia';
import { getLinkAnalytics, getLinkClicks } from '@/lib/links/analytics';
import { findAppLink } from '@/lib/links/serialize';
import {
  authorizeLinkApp,
  createLinksRouter,
  type LinksAuthContext,
  linkNotFound,
  respondError,
} from './context';

const rangeQuery = t.Optional(t.String());

function parseRange(value: string | undefined) {
  return LinkAnalyticsRangeSchema.safeParse(
    value ?? LINK_ANALYTICS_DEFAULT_RANGE
  );
}

function invalidRange(set: { status?: number | string }) {
  return respondError(
    set,
    HttpStatus.BAD_REQUEST,
    ErrorCode.VALIDATION_ERROR,
    `range must be one of: ${LinkAnalyticsRangeSchema.options.join(', ')}`
  );
}

export const linkAnalyticsRouter = createLinksRouter()
  .get(
    '/:linkId/analytics',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & LinksAuthContext;
      const range = parseRange(query.range);
      if (!range.success) {
        return invalidRange(set);
      }

      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }
      if (!(await findAppLink(query.appId, params.linkId))) {
        return linkNotFound(set);
      }

      return getLinkAnalytics({
        appId: query.appId,
        linkId: params.linkId,
        range: range.data,
      });
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({ appId: t.String(), range: rangeQuery }),
      response: {
        200: LinkAnalyticsResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/:linkId/clicks',
    async (ctx) => {
      const { params, query, user, set } = ctx as typeof ctx & LinksAuthContext;
      const range = parseRange(query.range);
      if (!range.success) {
        return invalidRange(set);
      }

      const denied = await authorizeLinkApp(user, query.appId, set);
      if (denied) {
        return denied;
      }
      if (!(await findAppLink(query.appId, params.linkId))) {
        return linkNotFound(set);
      }

      return getLinkClicks({
        appId: query.appId,
        linkId: params.linkId,
        range: range.data,
        page: Number.parseInt(query.page ?? '1', 10) || 1,
        pageSize: Number.parseInt(query.pageSize ?? '10', 10) || 10,
      });
    },
    {
      params: t.Object({ linkId: t.String() }),
      query: t.Object({
        appId: t.String(),
        range: rangeQuery,
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
      response: {
        200: LinkClicksListResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
      },
    }
  );
