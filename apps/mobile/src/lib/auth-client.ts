import { expoClient } from "@better-auth/expo/client";
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
  ],
});

export const { useSession, signIn, signOut, signUp } = authClient;

type ExpoAuthClient = typeof authClient & {
  getCookie: () => string;
};

export function getAuthCookie(): string {
  return (authClient as ExpoAuthClient).getCookie();
}
