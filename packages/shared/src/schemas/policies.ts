import { z } from 'zod';
import { LinkSlugSchema } from './links';

export const PolicyNameSchema = z.string().trim().min(1).max(128);

export const PolicyDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be YYYY-MM-DD',
});

export const PolicyContentSchema = z.string().min(1).max(100_000);

export const CreatePolicyRequestSchema = z.object({
  appId: z.string().min(1),
  name: PolicyNameSchema,
  slug: LinkSlugSchema,
  domainId: z.string().nullable().optional(),
  date: PolicyDateSchema,
  content: PolicyContentSchema,
});

export const UpdatePolicyRequestSchema = z.object({
  name: PolicyNameSchema.optional(),
  slug: LinkSlugSchema.optional(),
  domainId: z.string().nullable().optional(),
  date: PolicyDateSchema.optional(),
  content: PolicyContentSchema.optional(),
});

export const PolicyListItemSchema = z.object({
  id: z.string(),
  linkId: z.string(),
  name: z.string(),
  slug: z.string(),
  domainId: z.string().nullable(),
  date: PolicyDateSchema,
  publicUrl: z.string().url(),
  totalClicks: z.number().int().nonnegative().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PoliciesListResponseSchema = z.object({
  policies: z.array(PolicyListItemSchema),
});

export const PolicyDetailSchema = PolicyListItemSchema.extend({
  appId: z.string(),
  content: z.string(),
});

export const PublicPolicyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: PolicyDateSchema,
  content: z.string(),
  appName: z.string().nullable(),
});

export const PolicySlugAvailableResponseSchema = z.object({
  available: z.boolean(),
});

export type CreatePolicyRequest = z.infer<typeof CreatePolicyRequestSchema>;
export type UpdatePolicyRequest = z.infer<typeof UpdatePolicyRequestSchema>;
export type PolicyListItem = z.infer<typeof PolicyListItemSchema>;
export type PoliciesListResponse = z.infer<typeof PoliciesListResponseSchema>;
export type PolicyDetail = z.infer<typeof PolicyDetailSchema>;
export type PublicPolicyResponse = z.infer<typeof PublicPolicyResponseSchema>;
