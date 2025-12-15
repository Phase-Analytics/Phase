import { z } from 'zod';
import { APP_NAME } from '../constants/validation';

export const CreateAppRequestSchema = z.object({
  name: z
    .string()
    .min(APP_NAME.MIN_LENGTH)
    .max(APP_NAME.MAX_LENGTH)
    .regex(APP_NAME.PATTERN, {
      message:
        'App name must be 3-14 characters and contain only letters, numbers, spaces, and hyphens',
    }),
  image: z.string().url().optional(),
});

export const UpdateAppRequestSchema = z.object({
  name: z
    .string()
    .min(APP_NAME.MIN_LENGTH)
    .max(APP_NAME.MAX_LENGTH)
    .regex(APP_NAME.PATTERN),
});

export const AddTeamMemberRequestSchema = z.object({
  email: z.string().email(),
});

export const AddTeamMemberResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
});

export const AppListItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  role: z.enum(['owner', 'member']),
});

export const AppCreatedSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  image: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});

export const AppsListResponseSchema = z.object({
  apps: z.array(AppListItemSchema),
});

export const AppDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  image: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  role: z.enum(['owner', 'member']),
});

export const AppKeysResponseSchema = z.object({
  key: z.string(),
  keyRotatedAt: z.string().datetime().nullable(),
});

export const AppTeamMemberSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
});

export const AppTeamResponseSchema = z.object({
  owner: z.object({
    userId: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
  }),
  members: z.array(AppTeamMemberSchema),
});

export type CreateAppRequest = z.infer<typeof CreateAppRequestSchema>;
export type UpdateAppRequest = z.infer<typeof UpdateAppRequestSchema>;
export type AddTeamMemberRequest = z.infer<typeof AddTeamMemberRequestSchema>;
export type AddTeamMemberResponse = z.infer<typeof AddTeamMemberResponseSchema>;
export type AppListItem = z.infer<typeof AppListItemSchema>;
export type AppCreated = z.infer<typeof AppCreatedSchema>;
export type AppsListResponse = z.infer<typeof AppsListResponseSchema>;
export type AppDetailResponse = z.infer<typeof AppDetailResponseSchema>;
export type AppKeysResponse = z.infer<typeof AppKeysResponseSchema>;
export type AppTeamMember = z.infer<typeof AppTeamMemberSchema>;
export type AppTeamResponse = z.infer<typeof AppTeamResponseSchema>;
