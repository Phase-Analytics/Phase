import { gunzipSync } from 'node:zlib';
import { ErrorCode, HttpStatus } from '@phase/shared';
import { Elysia } from 'elysia';

const PAYLOAD_TOO_LARGE = 413;
const MAX_COMPRESSED_SIZE = 10 * 1024 * 1024;
const MAX_DECOMPRESSED_SIZE = 50 * 1024 * 1024;

class GzipBodyError extends Error {
  readonly status: number;
  readonly errorCode: string;

  constructor(status: number, errorCode: string, detail: string) {
    super(detail);
    this.name = 'GzipBodyError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

function payloadTooLarge(detail: string): GzipBodyError {
  return new GzipBodyError(PAYLOAD_TOO_LARGE, 'PAYLOAD_TOO_LARGE', detail);
}

function badRequest(detail: string): GzipBodyError {
  return new GzipBodyError(
    HttpStatus.BAD_REQUEST,
    ErrorCode.BAD_REQUEST,
    detail
  );
}

function isOutputLimitError(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'ERR_BUFFER_TOO_LARGE';
}

/**
 * Inflates into a buffer capped at MAX_DECOMPRESSED_SIZE, so a gzip bomb
 * stops at the cap instead of being fully expanded first.
 */
function gunzipBounded(compressed: ArrayBuffer): Buffer {
  try {
    return gunzipSync(new Uint8Array(compressed), {
      maxOutputLength: MAX_DECOMPRESSED_SIZE,
    });
  } catch (error) {
    if (isOutputLimitError(error)) {
      throw payloadTooLarge(
        `Decompressed payload exceeds limit of ${MAX_DECOMPRESSED_SIZE} bytes`
      );
    }
    throw badRequest('Invalid gzip payload');
  }
}

export const gzipDecompressionPlugin = new Elysia({
  name: 'gzip-decompression',
})
  .onParse(async ({ request, contentType }) => {
    if (request.headers.get('content-encoding')?.toLowerCase() !== 'gzip') {
      return;
    }

    if (Number(request.headers.get('content-length')) > MAX_COMPRESSED_SIZE) {
      throw payloadTooLarge(
        `Compressed payload exceeds limit of ${MAX_COMPRESSED_SIZE} bytes`
      );
    }

    const compressed = await request.arrayBuffer();
    if (compressed.byteLength > MAX_COMPRESSED_SIZE) {
      throw payloadTooLarge(
        `Compressed payload exceeds limit of ${MAX_COMPRESSED_SIZE} bytes`
      );
    }

    const text = new TextDecoder().decode(gunzipBounded(compressed));

    if (!contentType?.includes('application/json')) {
      return text;
    }

    try {
      return JSON.parse(text);
    } catch {
      throw badRequest('Decompressed body is not valid JSON');
    }
  })
  // Elysia wraps anything thrown from a parser in a generic ParseError.
  .onError(({ code, error, set }) => {
    const cause = code === 'PARSE' ? error.cause : null;
    if (cause instanceof GzipBodyError) {
      set.status = cause.status;
      return { code: cause.errorCode, detail: cause.message };
    }
  })
  .as('scoped');
