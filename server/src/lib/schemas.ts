import { z } from '@hono/zod-openapi';

export const errorResponseSchema = z.object({
  code: z.string(),
  detail: z.string(),
  meta: z.any().optional(),
});

export const paginationSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
  dataKey: string
) =>
  z.object({
    [dataKey]: z.array(dataSchema),
    pagination: paginationSchema,
  });

export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean().default(true),
    data: dataSchema,
  });

export const errorResponses = {
  400: {
    description: 'Bad Request',
    content: {
      'application/json': {
        schema: errorResponseSchema,
      },
    },
  },
  401: {
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: errorResponseSchema,
      },
    },
  },
  429: {
    description: 'Too Many Requests',
    content: {
      'application/json': {
        schema: errorResponseSchema,
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: errorResponseSchema,
      },
    },
  },
};
