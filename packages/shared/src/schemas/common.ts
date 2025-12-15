import { z } from 'zod';

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
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
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorResponseSchema = z.object({
  code: z.string(),
  detail: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorResponse<
  TMeta extends Record<string, unknown> | undefined = undefined,
> = {
  code: ErrorCode;
  detail: string;
} & (TMeta extends undefined
  ? { meta?: Record<string, unknown> }
  : { meta: TMeta });

export const PaginationMetaSchema = z.object({
  total: z.number().min(0),
  page: z.number().min(1),
  pageSize: z.number().min(1),
  totalPages: z.number().min(0),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export type PaginationQuery = {
  page?: string;
  pageSize?: string;
};

export type DateFilterQuery = {
  startDate?: string;
  endDate?: string;
};

export type PaginationQueryParams = {
  page?: string;
  pageSize?: string;
};

export type DateFilterQueryParams = {
  startDate?: string;
  endDate?: string;
};

export type DateRangeParams = {
  startDate?: string;
  endDate?: string;
};

export type TimeRange = '7d' | '30d' | '90d' | 'all';
