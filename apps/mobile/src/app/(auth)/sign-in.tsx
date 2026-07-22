import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PhaseLogo } from "@/components/phase-logo";
import { PrimaryButton, Screen } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { track } from "@/lib/analytics";
import {
  authClient,
  getAuthCookie,
  getQueryParam,
  getWebAuthURL,
  persistSessionToken,
} from "@/lib/auth-client";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const openingRef = useRef(false);

  async function onLogin() {
    if (openingRef.current || loading) {
      return;
    }

    openingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      const redirectUri = Linking.createURL("/");
      const authUrl = `${getWebAuthURL()}/auth?callbackURL=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri
      );

      if (result.type !== "success") {
        return;
      }

      const token = getQueryParam(result.url, "token");
      const expiresAt = getQueryParam(result.url, "expires_at");
      const cookieName =
        getQueryParam(result.url, "cookie_name") ||
        "__Secure-better-auth.session_token";

      if (!token || !expiresAt) {
        setError("Sign in did not complete. Try again.");
        return;
      }

      await persistSessionToken({ token, expiresAt, cookieName });

      if (!getAuthCookie()) {
        setError("Could not store session. Try again.");
        return;
      }

      const session = await authClient.getSession({
        fetchOptions: {
          cache: "no-store",
        },
      });

      if (session.error) {
        setError(session.error.message ?? "Sign in failed");
        return;
      }

      if (!session.data) {
        setError("Session could not be loaded");
        return;
      }

      void track("mobile_sign_in", { method: "web" });
      router.replace("/(app)/(tabs)/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      openingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.content}>
        <PhaseLogo tagline="Privacy-first analytics" />

        <View style={styles.actions}>
          {error ? (
            <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
          ) : null}
          <PrimaryButton
            disabled={loading}
            label={loading ? "Opening…" : "Log in"}
            onPress={() => void onLogin()}
          />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Continues in your browser on phase.sh
          </Text>
          <Text
            accessibilityRole="link"
            onPress={() => {
              void Linking.openURL(
                "https://phase.sh/docs/privacy/privacy-policy"
              );
            }}
            style={[styles.policy, { color: theme.textSecondary }]}
          >
            Privacy Policy
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.five,
    paddingVertical: Spacing.six,
  },
  actions: { gap: Spacing.three },
  error: { fontSize: 14, textAlign: "center" },
  hint: {
    fontSize: 13,
    textAlign: "center",
  },
  policy: {
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
