import { expoClient, getSetCookie, storageAdapter } from "@better-auth/expo/client";
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

type SessionPayload = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  session: {
    id: string;
    expiresAt: string | Date;
  };
};

type HandoffExchangeResponse = {
  cookie: string;
  session: SessionPayload;
};

export async function applyAuthCodeFromRedirect(url: string): Promise<void> {
  const code = getQueryParam(url, "code");
  if (!code) {
    throw new Error("Sign in did not complete. Try again.");
  }

  const response = await fetch(`${baseURL}/api/auth/expo-mobile-exchange`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "expo-origin": Linking.createURL("/"),
      "x-skip-oauth-proxy": "true",
    },
    body: JSON.stringify({ code }),
  });

  const payload = (await response.json()) as
    | HandoffExchangeResponse
    | { message?: string };
  if (!response.ok || !("cookie" in payload) || !("session" in payload)) {
    throw new Error(
      ("message" in payload && payload.message) || "Session exchange failed"
    );
  }

  const next = getSetCookie(payload.cookie);
  await storage.setItem(COOKIE_KEY, next);

  if (!getAuthCookie()) {
    throw new Error("Could not store session. Try again.");
  }

  await storage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload.session));

  const sessionAtom = authClient.$store.atoms.session;
  sessionAtom?.set({
    ...sessionAtom.get(),
    data: payload.session,
    error: null,
    isPending: false,
  });
  authClient.$store.notify("$sessionSignal");
}
