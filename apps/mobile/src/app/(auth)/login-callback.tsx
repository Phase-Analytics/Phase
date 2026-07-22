import { Redirect } from "expo-router";

/**
 * Deep-link landing for ASWebAuthenticationSession.
 * Session establishment happens in sign-in's openAuthSessionAsync result handler.
 */
export default function LoginCallbackScreen() {
  return <Redirect href="/(auth)/sign-in" />;
}
