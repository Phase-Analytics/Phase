import type { Context } from 'hono';
import { ErrorCode, HttpStatus } from '@/types/codes';

export function badRequest(c: Context, code: ErrorCode, detail: string) {
  return c.json({ code, detail }, HttpStatus.BAD_REQUEST);
}

export function badRequestWithMeta(
  c: Context,
  code: ErrorCode,
  detail: string,
  meta: unknown
) {
  return c.json({ code, detail, meta }, HttpStatus.BAD_REQUEST);
}

export function unauthorized(c: Context, detail: string) {
  return c.json(
    { code: ErrorCode.UNAUTHORIZED, detail },
    HttpStatus.UNAUTHORIZED
  );
}

export function tooManyRequests(
  c: Context,
  detail: string,
  retryAfter: string
) {
  return c.json(
    { code: ErrorCode.TOO_MANY_REQUESTS, detail, meta: { retryAfter } },
    HttpStatus.TOO_MANY_REQUESTS
  );
}

export function internalServerError(c: Context, detail: string) {
  return c.json(
    { code: ErrorCode.INTERNAL_SERVER_ERROR, detail },
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}

export function errorResponseWithMeta(
  c: Context,
  options: {
    status: HttpStatus;
    code: ErrorCode;
    detail: string;
    meta: unknown;
  }
) {
  return c.json(
    { code: options.code, detail: options.detail, meta: options.meta },
    options.status
  );
}
