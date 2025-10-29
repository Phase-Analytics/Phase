export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PROFILE_ALREADY_EXISTS: 'PROFILE_ALREADY_EXISTS',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  PUSH_KEY_NOT_FOUND: 'PUSH_KEY_NOT_FOUND',

  FILTER_NOT_FOUND: 'FILTER_NOT_FOUND',
  FILTER_NOT_ACTIVE: 'FILTER_NOT_ACTIVE',

  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',

  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type ErrorResponse = {
  code: ErrorCode;
  detail: string;
  meta?: unknown;
};

export type SuccessResponse<T> = T;
