import { z } from '@hono/zod-openapi';

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const errorResponseSchema = z
  .object({
    code: z
      .enum([
        ErrorCode.VALIDATION_ERROR,
        ErrorCode.BAD_REQUEST,
        ErrorCode.UNAUTHORIZED,
        ErrorCode.FORBIDDEN,
        ErrorCode.NOT_FOUND,
        ErrorCode.CONFLICT,
        ErrorCode.TOO_MANY_REQUESTS,
        ErrorCode.INTERNAL_SERVER_ERROR,
      ])
      .openapi({ example: 'VALIDATION_ERROR' }),
    detail: z.string().openapi({ example: 'Invalid request parameters' }),
    meta: z
      .record(z.string(), z.unknown())
      .optional()
      .openapi({
        example: { retryAfter: '60s', field: 'email' },
      }),
  })
  .openapi('ErrorResponse');

export type ErrorResponse<
  TMeta extends Record<string, unknown> | undefined = undefined,
> = {
  code: ErrorCode;
  detail: string;
} & (TMeta extends undefined
  ? { meta?: Record<string, unknown> }
  : { meta: TMeta });

export const successResponseSchema = <TData extends z.ZodType>(
  dataSchema: TData
) => dataSchema.openapi('SuccessResponse');

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
  403: {
    description: 'Forbidden',
    content: {
      'application/json': {
        schema: errorResponseSchema,
      },
    },
  },
  404: {
    description: 'Not Found',
    content: {
      'application/json': {
        schema: errorResponseSchema,
      },
    },
  },
  409: {
    description: 'Conflict',
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
