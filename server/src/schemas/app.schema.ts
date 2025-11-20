import { z } from '@hono/zod-openapi';

export const createAppRequestSchema = z
  .object({
    name: z
      .string()
      .min(3, 'App name must be at least 3 characters')
      .max(14, 'App name must be at most 14 characters')
      .regex(
        /^[a-zA-Z0-9\s-]+$/,
        'App name can only contain letters, numbers, spaces, and hyphens'
      )
      .openapi({ example: 'My Awesome App' }),
    image: z.string().url().optional().openapi({
      example: 'https://example.com/logo.png',
    }),
  })
  .openapi('CreateAppRequest');

export const appListItemSchema = z
  .object({
    id: z.string().openapi({ example: '87654321098765' }),
    name: z.string().min(1).max(255).openapi({ example: 'My Awesome App' }),
  })
  .openapi('AppListItem');

export const appKeysResponseSchema = z
  .object({
    key: z.string().openapi({
      example: 'telemetra_R3aLLy5eCur3R4nd0mK3y123',
      description: 'The app key for SDK authentication',
    }),
  })
  .openapi('AppKeysResponse');

export const appTeamMemberSchema = z
  .object({
    userId: z.string().openapi({ example: 'user_123' }),
    email: z.string().email().openapi({ example: 'member@example.com' }),
  })
  .openapi('AppTeamMember');

export const appTeamResponseSchema = z
  .object({
    owner: z
      .object({
        userId: z.string().openapi({ example: 'user_123' }),
        email: z.string().email().openapi({ example: 'owner@example.com' }),
      })
      .openapi({ example: { userId: 'user_123', email: 'owner@example.com' } }),
    members: z.array(appTeamMemberSchema).openapi({
      example: [
        { userId: 'user_456', email: 'member1@example.com' },
        { userId: 'user_789', email: 'member2@example.com' },
      ],
    }),
  })
  .openapi('AppTeamResponse');

export const appCreatedSchema = z
  .object({
    id: z.string().openapi({ example: '87654321098765' }),
    name: z.string().min(1).max(255).openapi({ example: 'My Awesome App' }),
    image: z.string().url().nullable().openapi({
      example: 'https://example.com/logo.png',
    }),
    createdAt: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('AppCreated');

export const appsListResponseSchema = z
  .object({
    apps: z.array(appListItemSchema),
  })
  .openapi('AppsListResponse');

export const updateAppRequestSchema = z
  .object({
    name: z
      .string()
      .min(3, 'App name must be at least 3 characters')
      .max(14, 'App name must be at most 14 characters')
      .regex(
        /^[a-zA-Z0-9\s-]+$/,
        'App name can only contain letters, numbers, spaces, and hyphens'
      )
      .openapi({ example: 'My Renamed App' }),
  })
  .openapi('UpdateAppRequest');

export const appDetailResponseSchema = z
  .object({
    id: z.string().openapi({ example: '87654321098765' }),
    name: z.string().min(1).max(255).openapi({ example: 'My Awesome App' }),
    image: z.string().url().nullable().openapi({
      example: 'https://example.com/logo.png',
    }),
    createdAt: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
    role: z.enum(['owner', 'member']).openapi({ example: 'owner' }),
  })
  .openapi('AppDetailResponse');

export type CreateAppRequest = z.infer<typeof createAppRequestSchema>;
export type UpdateAppRequest = z.infer<typeof updateAppRequestSchema>;
export type AppListItemSchema = z.infer<typeof appListItemSchema>;
export type AppCreatedSchema = z.infer<typeof appCreatedSchema>;
export type AppsListResponse = z.infer<typeof appsListResponseSchema>;
export type AppDetailResponse = z.infer<typeof appDetailResponseSchema>;
export type AppKeysResponse = z.infer<typeof appKeysResponseSchema>;
export type AppTeamMember = z.infer<typeof appTeamMemberSchema>;
export type AppTeamResponse = z.infer<typeof appTeamResponseSchema>;
