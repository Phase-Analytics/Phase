import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

const serverURL = process.env.EXPO_PUBLIC_SERVER_URL;

if (serverURL === undefined || serverURL.trim() === "") {
  throw new Error("EXPO_PUBLIC_SERVER_URL is not defined");
}

const baseURL = serverURL.replace(/\/$/, "");
const STORAGE_PREFIX = "phase";
const COOKIE_KEY = `${STORAGE_PREFIX}_cookie`;
const SESSION_CACHE_KEY = `${STORAGE_PREFIX}_session_data`;

export const authClient = createAuthClient({
  baseURL,
  // better-fetch peer typing drifts between better-auth and @better-auth/expo
  plugins: [
    expoClient({
      scheme: "phase",
      storage: SecureStore,
      storagePrefix: STORAGE_PREFIX,
    }) as never,
  ],
});

export const { useSession, signOut } = authClient;

type ExpoAuthClient = typeof authClient & {
  getCookie: () => string;
};

export function getAuthCookie(): string {
  return (authClient as ExpoAuthClient).getCookie();
}

export function getWebAuthURL(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return baseURL.includes("localhost")
    ? "http://localhost:3002"
    : "https://phase.sh";
}

export function getQueryParam(url: string, key: string): string | null {
  try {
    return new URL(url).searchParams.get(key);
  } catch {
    const match = url.match(new RegExp(`[?&]${key}=([^&#]*)`));
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}

export async function persistSessionToken(input: {
  token: string;
  expiresAt: string;
  cookieName: string;
}): Promise<void> {
  const expires = new Date(input.expiresAt);
  if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
    throw new Error("Session token is expired");
  }

  const entry = {
    value: input.token,
    expires: expires.toISOString(),
  };

  const stored: Record<string, { value: string; expires: string }> = {
    [input.cookieName]: entry,
    "better-auth.session_token": entry,
    "__Secure-better-auth.session_token": entry,
  };

  await SecureStore.setItemAsync(COOKIE_KEY, JSON.stringify(stored));
}

type SessionPayload = {
  user: { id: string; email?: string | null; name?: string | null };
  session: { id: string; token: string };
};

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  const user = record.user as Record<string, unknown> | undefined;
  const session = record.session as Record<string, unknown> | undefined;
  return typeof user?.id === "string" && typeof session?.id === "string";
}

async function fetchSessionDirect(): Promise<SessionPayload | null> {
  const cookie = getAuthCookie();
  if (!cookie) {
    return null;
  }

  const response = await fetch(`${baseURL}/api/auth/get-session`, {
    method: "GET",
    headers: {
      cookie,
      "expo-origin": Linking.createURL("/"),
      "x-skip-oauth-proxy": "true",
    },
  });

  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(text);
    return isSessionPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function establishSessionFromRedirect(url: string): Promise<void> {
  const token =
    getQueryParam(url, "session_token") || getQueryParam(url, "token");
  const expiresAt = getQueryParam(url, "expires_at");
  const cookieName =
    getQueryParam(url, "cookie_name") ||
    "__Secure-better-auth.session_token";

  if (!token || !expiresAt) {
    throw new Error("Sign in did not complete. Try again.");
  }

  await persistSessionToken({ token, expiresAt, cookieName });

  if (!getAuthCookie()) {
    throw new Error("Could not store session. Try again.");
  }

  // Focus-manager may have an in-flight get-session from before the cookie
  // existed; bust dedupe and retry once if needed.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }

    const result = await authClient.getSession({
      fetchOptions: {
        headers: {
          "x-phase-auth-attempt": `${Date.now()}-${attempt}`,
        },
      },
    });

    if (result.error) {
      throw new Error(result.error.message ?? "Sign in failed");
    }

    if (isSessionPayload(result.data)) {
      return;
    }

    const direct = await fetchSessionDirect();
    if (direct) {
      await SecureStore.setItemAsync(SESSION_CACHE_KEY, JSON.stringify(direct));
      const warmed = await authClient.getSession({
        fetchOptions: {
          headers: {
            "x-phase-auth-attempt": `${Date.now()}-warm`,
          },
        },
      });
      if (isSessionPayload(warmed.data)) {
        return;
      }
      // Cache is warm enough for useSession after navigation in most cases.
      return;
    }
  }

  throw new Error("Session could not be loaded");
}
