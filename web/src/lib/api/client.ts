import type { ErrorResponse } from './types';

export const API_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

export const API_BASE = `${API_URL}/v1`;

export class ApiError extends Error {
  code: string;
  status: number;
  meta?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number,
    meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const { headers: optionHeaders, ...restOptions } = options || {};
  const response = await fetch(url, {
    credentials: 'include',
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...optionHeaders,
    },
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      detail: 'An unexpected error occurred',
    }));

    throw new ApiError(
      errorData.code,
      errorData.detail,
      response.status,
      errorData.meta
    );
  }

  return response.json();
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const filtered = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );

  if (filtered.length === 0) {
    return '';
  }

  const query = filtered
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join('&');

  return `?${query}`;
}
