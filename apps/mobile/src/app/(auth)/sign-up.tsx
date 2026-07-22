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
import { signUp } from "@/lib/auth-client";

export default function SignUpScreen() {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const result = await signUp.email({
        name: name.trim() || email.trim(),
        email: email.trim(),
        password,
      });
      if (result.error) {
        setError(result.error.message ?? "Sign up failed");
        return;
      }
      void track("mobile_sign_up", { method: "email" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
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
            <Text style={[styles.logo, { color: theme.text }]}>Create account</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              Start tracking with Phase
            </Text>
          </View>

          <View style={styles.form}>
            <Field
              autoCapitalize="words"
              label="Name"
              onChangeText={setName}
              placeholder="Ada Lovelace"
              value={name}
            />
            <Field
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="you@company.com"
              value={email}
            />
            <Field
              label="Password"
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              value={password}
            />
            {error ? (
              <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
            ) : null}
            <PrimaryButton
              disabled={loading || !email || password.length < 8}
              label={loading ? "Creating…" : "Create account"}
              onPress={() => void onSubmit()}
            />
          </View>

          <Text style={[styles.footer, { color: theme.textSecondary }]}>
            Already have an account?{" "}
            <Link href="/(auth)/sign-in" style={{ color: theme.text }}>
              Sign in
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
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -1,
  },
  tagline: { fontSize: 16 },
  form: { gap: Spacing.three },
  error: { fontSize: 14 },
  footer: {
    fontSize: 15,
    textAlign: "center",
  },
});
