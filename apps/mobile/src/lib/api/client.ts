import type { ErrorResponse } from "@phase/shared";

import { getAuthCookie } from "@/lib/auth-client";

const serverURL = process.env.EXPO_PUBLIC_SERVER_URL;

if (serverURL === undefined || serverURL.trim() === "") {
  throw new Error("EXPO_PUBLIC_SERVER_URL is not defined");
}

export const API_URL = serverURL.replace(/\/$/, "");
export const API_BASE = API_URL;

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
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

function authHeaders(): HeadersInit {
  const cookie = getAuthCookie();
  return cookie ? { cookie } : {};
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const { headers: optionHeaders, ...restOptions } = options || {};
  const response = await fetch(url, {
    credentials: "omit",
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...optionHeaders,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      detail: "An unexpected error occurred",
    }))) as ErrorResponse;

    throw new ApiError(
      errorData.code,
      errorData.detail,
      response.status,
      errorData.meta
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchApiFormData<T>(
  endpoint: string,
  formData: FormData,
  options?: Omit<RequestInit, "body">
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    credentials: "omit",
    method: "POST",
    body: formData,
    ...options,
    headers: {
      ...authHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      detail: "An unexpected error occurred",
    }))) as ErrorResponse;

    throw new ApiError(
      errorData.code,
      errorData.detail,
      response.status,
      errorData.meta
    );
  }

  return response.json() as Promise<T>;
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const filtered = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );

  if (filtered.length === 0) {
    return "";
  }

  const query = filtered
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join("&");

  return `?${query}`;
}
