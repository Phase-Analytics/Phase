import type { Context } from 'hono';
import { ErrorCode, type ErrorResponse, HttpStatus } from '@/schemas';

export function success<TData>(
  c: Context,
  data: TData,
  status: HttpStatus = HttpStatus.OK
) {
  if (status === HttpStatus.NO_CONTENT) {
    return c.body(null, 204);
  }
  // biome-ignore lint/suspicious/noExplicitAny: Hono c.json() requires ContentfulStatusCode but HttpStatus union type is incompatible
  return c.json(data, status as any);
}

export function badRequest(
  c: Context,
  code: ErrorCode,
  detail: string
): Response {
  const response: ErrorResponse = {
    code,
    detail,
  };
  return c.json(response, HttpStatus.BAD_REQUEST);
}

export function badRequestWithMeta<TMeta extends Record<string, unknown>>(
  c: Context,
  code: ErrorCode,
  detail: string,
  meta: TMeta
): Response {
  const response: ErrorResponse<TMeta> = {
    code,
    detail,
    meta,
  } as ErrorResponse<TMeta>;
  return c.json(response, HttpStatus.BAD_REQUEST);
}

export function unauthorized(c: Context, detail: string): Response {
  const response: ErrorResponse = {
    code: ErrorCode.UNAUTHORIZED,
    detail,
  };
  return c.json(response, HttpStatus.UNAUTHORIZED);
}

export function forbidden(c: Context, detail: string): Response {
  const response: ErrorResponse = {
    code: ErrorCode.FORBIDDEN,
    detail,
  };
  return c.json(response, HttpStatus.FORBIDDEN);
}

export function notFound(
  c: Context,
  code: ErrorCode,
  detail: string
): Response {
  const response: ErrorResponse = {
    code,
    detail,
  };
  return c.json(response, HttpStatus.NOT_FOUND);
}

export function conflict(
  c: Context,
  code: ErrorCode,
  detail: string
): Response {
  const response: ErrorResponse = {
    code,
    detail,
  };
  return c.json(response, HttpStatus.CONFLICT);
}

export function tooManyRequests(
  c: Context,
  detail: string,
  retryAfter: string
): Response {
  const response: ErrorResponse<{ retryAfter: string }> = {
    code: ErrorCode.TOO_MANY_REQUESTS,
    detail,
    meta: { retryAfter },
  };
  return c.json(response, HttpStatus.TOO_MANY_REQUESTS);
}

export function internalServerError(c: Context, detail: string): Response {
  const response: ErrorResponse = {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    detail,
  };
  return c.json(response, HttpStatus.INTERNAL_SERVER_ERROR);
}

export function errorResponse<
  TMeta extends Record<string, unknown> | undefined = undefined,
>(
  c: Context,
  options: {
    status: HttpStatus;
    code: ErrorCode;
    detail: string;
    meta?: TMeta;
  }
): Response {
  const response: ErrorResponse<TMeta> = {
    code: options.code,
    detail: options.detail,
    ...(options.meta !== undefined ? { meta: options.meta } : {}),
  } as ErrorResponse<TMeta>;
  // biome-ignore lint/suspicious/noExplicitAny: Hono c.json() requires ContentfulStatusCode but HttpStatus union type is incompatible
  return c.json(response, options.status as any);
}
