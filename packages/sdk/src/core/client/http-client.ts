import pako from 'pako';
import {
  type BatchRequest,
  type BatchResponse,
  type CreateDeviceRequest,
  type CreateEventRequest,
  type CreateSessionRequest,
  type DeviceResponse,
  type EventResponse,
  HttpError,
  type PingSessionRequest,
  type PingSessionResponse,
  type Result,
  type SessionResponse,
} from '../types';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

const BATCH_COMPRESSION_THRESHOLD = 100;
const REQUEST_TIMEOUT_MS = 30_000;

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.phase.sh') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    body: unknown,
    operationName: string,
    retryEnabled = true
  ): Promise<Result<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const jsonString = JSON.stringify(body);

    logger.debug(`${operationName}: ${endpoint} (${jsonString.length} bytes)`);

    const fetchFn = async (): Promise<T> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
      );

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: jsonString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response
            .text()
            .catch(() => 'Failed to read error response');
          const sanitizedError = this.sanitizeError(errorText);
          throw new HttpError(response.status, sanitizedError);
        }

        const text = await response.text();
        if (!text || text.length === 0) {
          throw new HttpError(
            response.status,
            'Server returned empty response body'
          );
        }
        return JSON.parse(text) as T;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof HttpError) {
          throw error;
        }
        if ((error as Error).name === 'AbortError') {
          throw new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
        }
        throw error;
      }
    };

    if (retryEnabled) {
      return await withRetry(fetchFn);
    }

    try {
      const data = await fetchFn();
      return { success: true, data };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`${operationName}: Failed without retry`, err);
      return { success: false, error: err };
    }
  }

  private sanitizeError(errorText: string): string {
    const maxLength = 500;
    if (errorText.length > maxLength) {
      return `${errorText.slice(0, maxLength)}... (truncated)`;
    }
    return errorText;
  }

  async createDevice(
    payload: CreateDeviceRequest
  ): Promise<Result<DeviceResponse>> {
    return await this.request<DeviceResponse>(
      '/sdk/devices',
      payload,
      'CreateDevice'
    );
  }

  async createSession(
    payload: CreateSessionRequest
  ): Promise<Result<SessionResponse>> {
    return await this.request<SessionResponse>(
      '/sdk/sessions',
      payload,
      'CreateSession'
    );
  }

  async createEvent(
    payload: CreateEventRequest
  ): Promise<Result<EventResponse>> {
    return await this.request<EventResponse>(
      '/sdk/events',
      payload,
      'CreateEvent'
    );
  }

  async pingSession(
    payload: PingSessionRequest
  ): Promise<Result<PingSessionResponse>> {
    return await this.request<PingSessionResponse>(
      '/sdk/ping',
      payload,
      'PingSession'
    );
  }

  async sendBatch(payload: BatchRequest): Promise<Result<BatchResponse>> {
    const shouldCompress = payload.items.length >= BATCH_COMPRESSION_THRESHOLD;

    if (shouldCompress) {
      return await this.requestCompressed<BatchResponse>(
        '/sdk/batch',
        payload,
        'SendBatch'
      );
    }

    return await this.request<BatchResponse>(
      '/sdk/batch',
      payload,
      'SendBatch'
    );
  }

  private async requestCompressed<T>(
    endpoint: string,
    body: unknown,
    operationName: string,
    retryEnabled = true
  ): Promise<Result<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const fetchFn = async (): Promise<T> => {
      const jsonString = JSON.stringify(body);
      const compressed = pako.gzip(jsonString);

      logger.debug(
        `${operationName}: ${endpoint} compressed (${jsonString.length} → ${compressed.length} bytes)`
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
      );

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: compressed,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response
            .text()
            .catch(() => 'Failed to read error response');
          const sanitizedError = this.sanitizeError(errorText);
          throw new HttpError(response.status, sanitizedError);
        }

        const text = await response.text();
        if (!text || text.length === 0) {
          throw new HttpError(
            response.status,
            'Server returned empty response body'
          );
        }
        return JSON.parse(text) as T;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof HttpError) {
          throw error;
        }
        if ((error as Error).name === 'AbortError') {
          throw new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
        }
        throw error;
      }
    };

    if (retryEnabled) {
      return await withRetry(fetchFn);
    }

    try {
      const data = await fetchFn();
      return { success: true, data };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`${operationName}: Failed without retry`, err);
      return { success: false, error: err };
    }
  }
}
