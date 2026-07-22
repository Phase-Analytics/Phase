import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const serverURL = process.env.EXPO_PUBLIC_SERVER_URL;

if (serverURL === undefined || serverURL.trim() === "") {
  throw new Error("EXPO_PUBLIC_SERVER_URL is not defined");
}

const baseURL = serverURL.replace(/\/$/, "");
const STORAGE_PREFIX = "phase";
const COOKIE_KEY = `${STORAGE_PREFIX}_cookie`;

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

  // Store both secure + plain names — production uses __Secure- prefix.
  const stored: Record<string, { value: string; expires: string }> = {
    [input.cookieName]: entry,
    "better-auth.session_token": entry,
    "__Secure-better-auth.session_token": entry,
  };

  await SecureStore.setItemAsync(COOKIE_KEY, JSON.stringify(stored));
}
