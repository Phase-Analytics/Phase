import { z } from '@hono/zod-openapi';

export const paginationSchema = z
  .object({
    total: z.number().int().min(0).openapi({ example: 100 }),
    page: z.number().int().min(1).openapi({ example: 1 }),
    pageSize: z.number().int().min(1).openapi({ example: 50 }),
    totalPages: z.number().int().min(0).openapi({ example: 2 }),
  })
  .openapi('Pagination');

export const paginationQuerySchema = z.object({
  page: z.string().optional().default('1').openapi({ example: '1' }),
  pageSize: z.string().optional().default('50').openapi({ example: '50' }),
});

export const dateFilterQuerySchema = z.object({
  startDate: z
    .string()
    .datetime()
    .optional()
    .openapi({ example: '2024-01-01T00:00:00Z' }),
  endDate: z
    .string()
    .datetime()
    .optional()
    .openapi({ example: '2024-12-31T23:59:59Z' }),
});

export const errorResponseSchema = z
  .object({
    code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
    detail: z.string().openapi({ example: 'Invalid request parameters' }),
    meta: z.any().optional(),
  })
  .openapi('ErrorResponse');

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
} as const;

export type PaginationSchema = z.infer<typeof paginationSchema>;
export type ErrorResponseSchema = z.infer<typeof errorResponseSchema>;
