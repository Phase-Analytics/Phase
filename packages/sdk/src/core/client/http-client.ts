import { gzipSync, strToU8 } from 'fflate';
import type { BatchItem, BatchResponse } from '../types';
import { backoffDelay, parseRetryAfterMs, sleep } from '../utils/retry';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 8000;
// Longer server-requested waits are handed back to the scheduler instead of blocking a flush.
const MAX_INLINE_RETRY_AFTER_MS = 10_000;
const COMPRESSION_THRESHOLD_BYTES = 1024;
const MAX_ERROR_DETAIL_LENGTH = 300;
const TRAILING_SLASHES = /\/+$/;

export type BatchSendResult =
  /** 2xx: per-item outcome is in `response.errors`. */
  | { kind: 'ok'; response: BatchResponse }
  /** Network error, timeout, 408, 429 or 5xx: nothing should be removed. */
  | { kind: 'retry'; error: Error; retryAfterMs: number | null }
  /** Any other 4xx: the request will never succeed as-is. */
  | { kind: 'rejected'; status: number; error: Error };

function parseBatchResponse(text: string): BatchResponse | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as BatchResponse;
    }
  } catch {
    // fall through
  }
  return null;
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly debugData: boolean;

  constructor(apiKey: string, baseUrl: string, debugData: boolean) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(TRAILING_SLASHES, '');
    this.debugData = debugData;
  }

  /**
   * Sends one batch, retrying transient failures with jittered backoff.
   * The body is serialized and compressed once for all attempts.
   */
  async sendBatch(
    items: BatchItem[],
    signal: AbortSignal
  ): Promise<BatchSendResult> {
    const json = JSON.stringify({ items });
    const compress = json.length >= COMPRESSION_THRESHOLD_BYTES;
    const body = compress ? gzipSync(strToU8(json)) : json;
    const headers = this.buildHeaders(compress);

    let result: BatchSendResult = {
      kind: 'retry',
      error: new Error('Flush deadline exceeded'),
      retryAfterMs: null,
    };

    for (
      let attempt = 0;
      attempt < MAX_ATTEMPTS && !signal.aborted;
      attempt++
    ) {
      result = await this.attempt(body, headers, signal);
      if (result.kind !== 'retry' || attempt === MAX_ATTEMPTS - 1) {
        break;
      }

      const delay =
        result.retryAfterMs ??
        backoffDelay(attempt, RETRY_BASE_MS, RETRY_MAX_MS);
      if (delay > MAX_INLINE_RETRY_AFTER_MS) {
        break;
      }
      await sleep(delay, signal);
    }

    return result;
  }

  private buildHeaders(compressed: boolean): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
      ...(this.debugData ? { 'x-phase-debug-data': '1' } : {}),
    };
  }

  private async attempt(
    body: string | Uint8Array,
    headers: Record<string, string>,
    flushSignal: AbortSignal
  ): Promise<BatchSendResult> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timer = setTimeout(abort, REQUEST_TIMEOUT_MS);
    flushSignal.addEventListener('abort', abort);

    try {
      const response = await fetch(`${this.baseUrl}/sdk/batch`, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      return await this.toResult(response);
    } catch (error) {
      const message = controller.signal.aborted
        ? `Request aborted (timeout ${REQUEST_TIMEOUT_MS}ms or flush deadline)`
        : `Network error: ${error instanceof Error ? error.message : String(error)}`;
      return { kind: 'retry', error: new Error(message), retryAfterMs: null };
    } finally {
      clearTimeout(timer);
      flushSignal.removeEventListener('abort', abort);
    }
  }

  private async toResult(response: Response): Promise<BatchSendResult> {
    const { status } = response;
    const text = await response.text().catch(() => '');

    if (response.ok) {
      const parsed = parseBatchResponse(text);
      if (parsed) {
        return { kind: 'ok', response: parsed };
      }
      // 200 means everything succeeded even if the body is unreadable; a 207
      // without readable per-item errors can't be acknowledged safely.
      return status === 207
        ? {
            kind: 'retry',
            error: new Error('Unreadable 207 response'),
            retryAfterMs: null,
          }
        : { kind: 'ok', response: {} };
    }

    const detail = text.slice(0, MAX_ERROR_DETAIL_LENGTH);
    const error = new Error(`HTTP ${status}${detail ? `: ${detail}` : ''}`);

    if (status === 408 || status === 429 || status >= 500) {
      return {
        kind: 'retry',
        error,
        retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')),
      };
    }

    return { kind: 'rejected', status, error };
  }
}
