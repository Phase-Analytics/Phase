import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PhaseLogo } from "@/components/phase-logo";
import { PrimaryButton, Screen } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { track } from "@/lib/analytics";
import { authClient, getWebAuthURL } from "@/lib/auth-client";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
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

      const ott = new URL(result.url).searchParams.get("ott");
      if (!ott) {
        setError("Sign in did not complete. Try again.");
        return;
      }

      const verified = await authClient.oneTimeToken.verify({ token: ott });
      if (verified.error) {
        setError(verified.error.message ?? "Sign in failed");
        return;
      }

      void track("mobile_sign_in", { method: "web" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
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
