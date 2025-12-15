import type { ErrorCode, ErrorResponse, HttpStatus } from '@phase/shared';

export type ErrorResponseWithStatus<
  TMeta extends Record<string, unknown> | undefined = undefined,
> = {
  response: ErrorResponse<TMeta>;
  status: HttpStatus;
};

export function createErrorResponse<
  TMeta extends Record<string, unknown> | undefined = undefined,
>(options: {
  status: HttpStatus;
  code: ErrorCode;
  detail: string;
  meta?: TMeta;
}): ErrorResponseWithStatus<TMeta> {
  const response: ErrorResponse<TMeta> = {
    code: options.code,
    detail: options.detail,
    ...(options.meta !== undefined ? { meta: options.meta } : {}),
  } as ErrorResponse<TMeta>;

  return {
    response,
    status: options.status,
  };
}
