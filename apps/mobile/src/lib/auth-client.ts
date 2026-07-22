import { expoClient } from "@better-auth/expo/client";
import { oneTimeTokenClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const serverURL = process.env.EXPO_PUBLIC_SERVER_URL;

if (serverURL === undefined || serverURL.trim() === "") {
  throw new Error("EXPO_PUBLIC_SERVER_URL is not defined");
}

const baseURL = serverURL.replace(/\/$/, "");

export const authClient = createAuthClient({
  baseURL,
  // better-fetch peer typing drifts between better-auth and @better-auth/expo
  plugins: [
    expoClient({
      scheme: "phase",
      storage: SecureStore,
      storagePrefix: "phase",
    }) as never,
    oneTimeTokenClient(),
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
