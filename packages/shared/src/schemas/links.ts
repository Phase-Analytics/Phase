import { z } from 'zod';
import { PaginationMetaSchema } from './common';

const LINK_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;
const URL_SCHEME_RE = /^([a-z][a-z0-9+.-]*):(.*)$/is;
const DIGIT_START_RE = /^\d/;
const WEB_SCHEMES = new Set(['http', 'https']);
const BLOCKED_SCHEMES = new Set(['javascript', 'data', 'vbscript', 'file']);
const MAX_LINK_URL_LENGTH = 2048;

/**
 * Returns the explicit scheme of a URL-ish value, or null for bare hosts.
 * `example.com:8080/x` and `localhost:3000` are hosts with ports, not schemes.
 */
function getExplicitScheme(value: string): string | null {
  const match = URL_SCHEME_RE.exec(value);
  if (!match) {
    return null;
  }
  const [, scheme = '', rest = ''] = match;
  if (rest.startsWith('//')) {
    return scheme.toLowerCase();
  }
  if (scheme.includes('.') || DIGIT_START_RE.test(rest)) {
    return null;
  }
  return scheme.toLowerCase();
}

function isParsableUrl(value: string): boolean {
  try {
    // biome-ignore lint/correctness/noUnusedInstantiation: construction is the validation; URL.canParse is missing from React Native's URL polyfill.
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function createLinkUrlSchema(options: { allowAppSchemes: boolean }) {
  return z
    .string()
    .trim()
    .max(MAX_LINK_URL_LENGTH)
    .transform((value, ctx) => {
      const scheme = getExplicitScheme(value);
      const normalized = scheme ? value : `https://${value}`;

      if (
        scheme &&
        !WEB_SCHEMES.has(scheme) &&
        (!options.allowAppSchemes || BLOCKED_SCHEMES.has(scheme))
      ) {
        ctx.addIssue({
          code: 'custom',
          message: options.allowAppSchemes
            ? `URLs using ${scheme}: are not allowed`
            : 'URL must start with http:// or https://',
        });
        return z.NEVER;
      }

      if (
        normalized.length > MAX_LINK_URL_LENGTH ||
        !isParsableUrl(normalized)
      ) {
        ctx.addIssue({ code: 'custom', message: 'Invalid URL' });
        return z.NEVER;
      }

      if (!scheme || WEB_SCHEMES.has(scheme)) {
        const { hostname } = new URL(normalized);
        if (!hostname.includes('.') && hostname !== 'localhost') {
          ctx.addIssue({ code: 'custom', message: 'Invalid URL' });
          return z.NEVER;
        }
      }

      return normalized;
    });
}

export const LinkSlugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(LINK_SLUG_PATTERN, {
    message:
      'Slug must be 3-64 characters, lowercase letters, numbers, and hyphens only',
  });

/** Main destination: http(s) only; bare hosts get https://. */
export const LinkUrlSchema = createLinkUrlSchema({ allowAppSchemes: false });

/** Web fallback for "other" devices: http(s) only. */
export const LinkUrlNullableSchema = createLinkUrlSchema({
  allowAppSchemes: false,
})
  .nullable()
  .optional();

/** iOS / Android routing: app deep links (myapp://path) are allowed. */
export const LinkDeviceAppUrlNullableSchema = createLinkUrlSchema({
  allowAppSchemes: true,
})
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

export const LinkNameSchema = z.string().trim().max(128).nullable().optional();

export const CreateLinkRequestSchema = z
  .object({
    appId: z.string().min(1),
    name: LinkNameSchema,
    slug: LinkSlugSchema,
    destinationUrl: LinkUrlSchema,
    deviceIosUrl: LinkDeviceAppUrlNullableSchema,
    deviceAndroidUrl: LinkDeviceAppUrlNullableSchema,
    deviceOthersUrl: LinkUrlNullableSchema,
    expiresAt: z.string().datetime().nullable().optional(),
    disabled: z.boolean().optional(),
    domainId: z.string().nullable().optional(),
  })
  .merge(LinkUtmFieldsSchema)
  .merge(LinkOgTextFieldsSchema);

export const UpdateLinkRequestSchema = z
  .object({
    name: LinkNameSchema,
    destinationUrl: LinkUrlSchema.optional(),
    slug: LinkSlugSchema.optional(),
    deviceIosUrl: LinkDeviceAppUrlNullableSchema,
    deviceAndroidUrl: LinkDeviceAppUrlNullableSchema,
    deviceOthersUrl: LinkUrlNullableSchema,
    expiresAt: z.string().datetime().nullable().optional(),
    disabled: z.boolean().optional(),
    domainId: z.string().nullable().optional(),
  })
  .merge(LinkUtmFieldsSchema)
  .merge(LinkOgTextFieldsSchema);

export const LinkListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  slug: z.string(),
  destinationUrl: z.string(),
  shortUrl: z.string(),
  expiresAt: z.string().datetime().nullable(),
  disabledAt: z.string().datetime().nullable(),
  /** Blocked by Phase staff for abuse; the link returns 410 regardless of owner settings. */
  banned: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Omitted when click totals are temporarily unavailable. */
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
  domainId: z.string().nullable(),
  destinationLocked: z.boolean(),
  policyId: z.string().nullable(),
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

export const LinkDomainDnsRecordSchema = z.object({
  type: z.enum(['A', 'AAAA', 'CNAME', 'TXT', 'CAA', 'ALIAS', 'ANAME']),
  name: z.string(),
  value: z.string(),
  purpose: z.enum(['routing', 'ownership', 'certificate', 'other']),
  required: z.boolean(),
  status: z.enum(['pending', 'valid', 'invalid', 'unknown']),
});

export const LinkDomainSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  status: z.enum(['pending', 'verified', 'failed']),
  providerStatus: z.string().nullable(),
  verificationStatus: z.string().nullable(),
  certificateStatus: z.string().nullable(),
  dnsRecords: z.array(LinkDomainDnsRecordSchema),
  lastCheckAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
  /** Verified and still serving, but the provider currently reports a non-active state. */
  degraded: z.boolean(),
  createdAt: z.string().datetime(),
  cnameTarget: z.string(),
});

export const LinkDomainsListResponseSchema = z.object({
  domains: z.array(LinkDomainSchema),
});

export const LINK_ANALYTICS_RANGES = ['7d', '30d', '180d', '360d'] as const;
export const LinkAnalyticsRangeSchema = z.enum(LINK_ANALYTICS_RANGES);
export const LINK_ANALYTICS_DEFAULT_RANGE: LinkAnalyticsRange = '30d';

export const LinkBanRequestSchema = z.object({
  banned: z.boolean(),
});

export const LinkAnalyticsBreakdownItemSchema = z.object({
  key: z.string(),
  count: z.number().int().nonnegative(),
});

export const LinkAnalyticsTimeseriesPointSchema = z.object({
  date: z.string(),
  clicks: z.number().int().nonnegative(),
  uniqueVisits: z.number().int().nonnegative(),
});

export const LinkClickItemSchema = z.object({
  clickId: z.string(),
  timestamp: z.string(),
  os: z.string(),
  browser: z.string(),
  referrer: z.string(),
  countryCode: z.string().nullable(),
});

export const LinkClicksListResponseSchema = z.object({
  clicks: z.array(LinkClickItemSchema),
  pagination: PaginationMetaSchema,
});

export const LinkAnalyticsResponseSchema = z.object({
  totalClicks: z.number().int().nonnegative(),
  uniqueVisits: z.number().int().nonnegative(),
  timeseries: z.array(LinkAnalyticsTimeseriesPointSchema),
  countries: z.array(LinkAnalyticsBreakdownItemSchema),
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
export type LinkDomainDnsRecord = z.infer<typeof LinkDomainDnsRecordSchema>;
export type LinkDomain = z.infer<typeof LinkDomainSchema>;
export type LinkAnalyticsResponse = z.infer<typeof LinkAnalyticsResponseSchema>;
export type LinkAnalyticsRange = z.infer<typeof LinkAnalyticsRangeSchema>;
export type LinkBanRequest = z.infer<typeof LinkBanRequestSchema>;
export type LinkClickItem = z.infer<typeof LinkClickItemSchema>;
export type LinkClicksListResponse = z.infer<
  typeof LinkClicksListResponseSchema
>;
