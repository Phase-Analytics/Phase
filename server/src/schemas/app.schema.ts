import { z } from '@hono/zod-openapi';

export const createAppRequestSchema = z
  .object({
    name: z.string().min(1).max(255).openapi({ example: 'My Awesome App' }),
    image: z.string().url().optional().openapi({
      example: 'https://example.com/logo.png',
    }),
  })
  .openapi('CreateAppRequest');

export const appSchema = z
  .object({
    id: z.string().openapi({ example: '87654321098765' }),
    name: z.string().min(1).max(255).openapi({ example: 'My Awesome App' }),
    image: z.string().url().nullable().openapi({
      example: 'https://example.com/logo.png',
    }),
  })
  .openapi('App');

export const appDetailSchema = z
  .object({
    id: z.string().openapi({ example: '87654321098765' }),
    name: z.string().min(1).max(255).openapi({ example: 'My Awesome App' }),
    image: z.string().url().nullable().openapi({
      example: 'https://example.com/logo.png',
    }),
    key: z.string().openapi({
      example: 'telemetra_R3aLLy5eCur3R4nd0mK3y123',
      description: 'The app key for SDK authentication',
    }),
    createdAt: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('AppDetail');

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
    apps: z.array(appSchema),
  })
  .openapi('AppsListResponse');

export type CreateAppRequest = z.infer<typeof createAppRequestSchema>;
export type AppSchema = z.infer<typeof appSchema>;
export type AppDetailSchema = z.infer<typeof appDetailSchema>;
export type AppCreatedSchema = z.infer<typeof appCreatedSchema>;
export type AppsListResponse = z.infer<typeof appsListResponseSchema>;
