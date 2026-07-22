import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Field, PrimaryButton, Screen } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { track } from "@/lib/analytics";
import { signIn } from "@/lib/auth-client";

export default function SignInScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(result.error.message ?? "Sign in failed");
        return;
      }
      void track("mobile_sign_in", { method: "email" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onGitHub() {
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.social({
        provider: "github",
        callbackURL: "phase://",
      });
      if (result.error) {
        setError(result.error.message ?? "GitHub sign in failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Text style={[styles.logo, { color: theme.text }]}>Phase</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              Privacy-first analytics
            </Text>
          </View>

          <View style={styles.form}>
            <Field
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="you@company.com"
              value={email}
            />
            <Field
              label="Password"
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              value={password}
            />
            {error ? (
              <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
            ) : null}
            <PrimaryButton
              disabled={loading || !email || !password}
              label={loading ? "Signing in…" : "Sign in"}
              onPress={() => void onSubmit()}
            />
            <PrimaryButton
              disabled={loading}
              label="Continue with GitHub"
              onPress={() => void onGitHub()}
              variant="secondary"
            />
          </View>

          <Text style={[styles.footer, { color: theme.textSecondary }]}>
            No account?{" "}
            <Link href="/(auth)/sign-up" style={{ color: theme.text }}>
              Sign up
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: Spacing.five,
    paddingVertical: Spacing.six,
  },
  brand: { gap: Spacing.one },
  logo: {
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 16,
  },
  form: { gap: Spacing.three },
  error: { fontSize: 14 },
  footer: {
    fontSize: 15,
    textAlign: "center",
  },
});
