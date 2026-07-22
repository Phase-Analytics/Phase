import { expoClient, getSetCookie, storageAdapter } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const serverURL = process.env.EXPO_PUBLIC_SERVER_URL;

if (serverURL === undefined || serverURL.trim() === "") {
  throw new Error("EXPO_PUBLIC_SERVER_URL is not defined");
}

const baseURL = serverURL.replace(/\/$/, "");
const STORAGE_PREFIX = "phase";
const COOKIE_KEY = `${STORAGE_PREFIX}_cookie`;

// Same storage adapter instance pattern as expoClient (SecureStore sync API).
const storage = storageAdapter(SecureStore);

export const authClient = createAuthClient({
  baseURL,
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

/**
 * Exact same post-OAuth cookie apply path as @better-auth/expo:
 * parse Set-Cookie from deep link → SecureStore → notify session signal.
 */
export async function applyAuthCookieFromRedirect(url: string): Promise<void> {
  const cookie = getQueryParam(url, "cookie");
  if (!cookie) {
    throw new Error("Sign in did not complete. Try again.");
  }

  const previous = storage.getItem(COOKIE_KEY);
  const next = getSetCookie(cookie, previous ?? undefined);
  await storage.setItem(COOKIE_KEY, next);

  if (!getAuthCookie()) {
    throw new Error("Could not store session. Try again.");
  }

  // This is what v1 GitHub OAuth did — without it useSession stays logged out.
  authClient.$store.notify("$sessionSignal");

  for (let attempt = 0; attempt < 8; attempt++) {
    const session = await authClient.getSession();
    if (session.error) {
      throw new Error(session.error.message ?? "Sign in failed");
    }
    if (session.data?.user) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Session could not be loaded");
}
