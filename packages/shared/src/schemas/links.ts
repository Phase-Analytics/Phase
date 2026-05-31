import { z } from 'zod';
import { PaginationMetaSchema } from './common';

const LINK_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;
const HTTP_PREFIX_RE = /^https?:\/\//i;

export const LinkSlugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(LINK_SLUG_PATTERN, {
    message:
      'Slug must be 3-64 characters, lowercase letters, numbers, and hyphens only',
  });

export const LinkUrlSchema = z
  .string()
  .trim()
  .transform((value) => {
    if (!value) {
      return value;
    }
    if (HTTP_PREFIX_RE.test(value)) {
      return value;
    }
    return `https://${value}`;
  })
  .pipe(z.string().url().max(2048));

export const LinkUrlNullableSchema = z
  .string()
  .trim()
  .transform((value) => {
    if (!value) {
      return value;
    }
    if (HTTP_PREFIX_RE.test(value)) {
      return value;
    }
    return `https://${value}`;
  })
  .pipe(z.string().url().max(2048))
  .nullable()
  .optional();

export const LinkUtmFieldsSchema = z.object({
  utmSource: z.string().max(256).nullable().optional(),
  utmMedium: z.string().max(256).nullable().optional(),
  utmCampaign: z.string().max(256).nullable().optional(),
  utmTerm: z.string().max(256).nullable().optional(),
  utmContent: z.string().max(256).nullable().optional(),
});

export const LinkOgTextFieldsSchema = z.object({
  ogTitle: z.string().max(200).nullable().optional(),
  ogDescription: z.string().max(500).nullable().optional(),
});

export const CreateLinkRequestSchema = z
  .object({
    appId: z.string().min(1),
    slug: LinkSlugSchema,
    destinationUrl: LinkUrlSchema,
    deviceIosUrl: LinkUrlNullableSchema,
    deviceAndroidUrl: LinkUrlNullableSchema,
    deviceOthersUrl: LinkUrlNullableSchema,
    expiresAt: z.string().datetime().nullable().optional(),
    disabled: z.boolean().optional(),
    domainIds: z.array(z.string()).optional(),
  })
  .merge(LinkUtmFieldsSchema)
  .merge(LinkOgTextFieldsSchema);

export const UpdateLinkRequestSchema = z
  .object({
    destinationUrl: LinkUrlSchema.optional(),
    slug: LinkSlugSchema.optional(),
    deviceIosUrl: LinkUrlNullableSchema,
    deviceAndroidUrl: LinkUrlNullableSchema,
    deviceOthersUrl: LinkUrlNullableSchema,
    expiresAt: z.string().datetime().nullable().optional(),
    disabled: z.boolean().optional(),
    domainIds: z.array(z.string()).optional(),
  })
  .merge(LinkUtmFieldsSchema)
  .merge(LinkOgTextFieldsSchema);

export const LinkListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  destinationUrl: z.string(),
  shortUrl: z.string(),
  expiresAt: z.string().datetime().nullable(),
  disabledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  totalClicks: z.number().int().nonnegative().optional(),
});

export const LinksListResponseSchema = z.object({
  links: z.array(LinkListItemSchema),
});

export const LinkDetailSchema = LinkListItemSchema.extend({
  appId: z.string(),
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  utmTerm: z.string().nullable(),
  utmContent: z.string().nullable(),
  deviceIosUrl: z.string().nullable(),
  deviceAndroidUrl: z.string().nullable(),
  deviceOthersUrl: z.string().nullable(),
  ogTitle: z.string().nullable(),
  ogDescription: z.string().nullable(),
  ogImageUrl: z.string().url().nullable(),
  domainIds: z.array(z.string()),
});

export const SlugAvailableResponseSchema = z.object({
  available: z.boolean(),
});

export const CreateLinkDomainRequestSchema = z.object({
  appId: z.string().min(1),
  hostname: z
    .string()
    .min(4)
    .max(253)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i
    ),
});

export const LinkDomainSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  status: z.enum(['pending', 'verified', 'failed']),
  lastCheckAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string().datetime(),
  cnameTarget: z.string(),
});

export const LinkDomainsListResponseSchema = z.object({
  domains: z.array(LinkDomainSchema),
});

export const LinkAnalyticsBreakdownItemSchema = z.object({
  key: z.string(),
  count: z.number().int().nonnegative(),
});

export const LinkAnalyticsRegionItemSchema = z.object({
  region: z.string(),
  countryCode: z.string(),
  count: z.number().int().nonnegative(),
});

export const LinkAnalyticsTimeseriesPointSchema = z.object({
  date: z.string(),
  clicks: z.number().int().nonnegative(),
  uniqueVisits: z.number().int().nonnegative(),
});

export const LinkClickItemSchema = z.object({
  clickId: z.string(),
  timestamp: z.string().datetime(),
  platform: z.enum(['ios', 'android', 'others']),
  countryCode: z.string().nullable(),
});

export const LinkClicksListResponseSchema = z.object({
  clicks: z.array(LinkClickItemSchema),
  pagination: PaginationMetaSchema,
});

export const LinkAnalyticsResponseSchema = z.object({
  totalClicks: z.number().int().nonnegative(),
  totalClicksChange24h: z.number(),
  uniqueVisits: z.number().int().nonnegative(),
  uniqueVisitsChange24h: z.number(),
  timeseries: z.array(LinkAnalyticsTimeseriesPointSchema),
  countries: z.array(LinkAnalyticsBreakdownItemSchema),
  regions: z.array(LinkAnalyticsRegionItemSchema),
  operatingSystems: z.array(LinkAnalyticsBreakdownItemSchema),
  browsers: z.array(LinkAnalyticsBreakdownItemSchema),
  referrers: z.array(LinkAnalyticsBreakdownItemSchema),
});

export type CreateLinkRequest = z.infer<typeof CreateLinkRequestSchema>;
export type UpdateLinkRequest = z.infer<typeof UpdateLinkRequestSchema>;
export type LinkListItem = z.infer<typeof LinkListItemSchema>;
export type LinksListResponse = z.infer<typeof LinksListResponseSchema>;
export type LinkDetail = z.infer<typeof LinkDetailSchema>;
export type CreateLinkDomainRequest = z.infer<
  typeof CreateLinkDomainRequestSchema
>;
export type LinkDomain = z.infer<typeof LinkDomainSchema>;
export type LinkAnalyticsResponse = z.infer<typeof LinkAnalyticsResponseSchema>;
export type LinkAnalyticsRegionItem = z.infer<
  typeof LinkAnalyticsRegionItemSchema
>;
export type LinkClickItem = z.infer<typeof LinkClickItemSchema>;
export type LinkClicksListResponse = z.infer<
  typeof LinkClicksListResponseSchema
>;
