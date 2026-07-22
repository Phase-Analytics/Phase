import {
  expoClient,
  getSetCookie,
  storageAdapter,
} from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const serverURL = process.env.EXPO_PUBLIC_SERVER_URL;

if (serverURL === undefined || serverURL.trim() === "") {
  throw new Error("EXPO_PUBLIC_SERVER_URL is not defined");
}

const baseURL = serverURL.replace(/\/$/, "");
const STORAGE_PREFIX = "phase";
const COOKIE_KEY = `${STORAGE_PREFIX}_cookie`;

const secureStorage = storageAdapter({
  getItem: (key) => SecureStore.getItem(key),
  setItem: (key, value) => {
    SecureStore.setItem(key, value);
  },
});

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

export async function persistAuthCookieFromRedirect(
  cookieHeader: string
): Promise<void> {
  const previous = secureStorage.getItem(COOKIE_KEY);
  const next = getSetCookie(cookieHeader, previous ?? undefined);
  await secureStorage.setItem(COOKIE_KEY, next);
}
