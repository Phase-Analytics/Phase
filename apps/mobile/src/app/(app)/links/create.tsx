import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { Field, PrimaryButton, Screen } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import { useCreateLink } from "@/lib/api/queries/links";

export default function CreateLinkSheet() {
  const theme = useTheme();
  const router = useRouter();
  const { selectedAppId } = useSelectedApp();
  const createLink = useCreateLink();
  const [slug, setSlug] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!selectedAppId) {
      setError("Select an app first");
      return;
    }
    setError(null);
    try {
      await createLink.mutateAsync({
        appId: selectedAppId,
        slug: slug.trim(),
        destinationUrl: destinationUrl.trim(),
        name: name.trim() || null,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.form}>
          <Field
            label="Slug"
            onChangeText={setSlug}
            placeholder="launch"
            value={slug}
          />
          <Field
            keyboardType="url"
            label="Destination URL"
            onChangeText={setDestinationUrl}
            placeholder="https://example.com"
            value={destinationUrl}
          />
          <Field
            autoCapitalize="sentences"
            label="Name (optional)"
            onChangeText={setName}
            placeholder="Launch campaign"
            value={name}
          />
          {error ? (
            <Text style={{ color: theme.danger }}>{error}</Text>
          ) : null}
          <PrimaryButton
            disabled={
              createLink.isPending || !slug.trim() || !destinationUrl.trim()
            }
            label={createLink.isPending ? "Creating…" : "Create link"}
            onPress={() => void onSubmit()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
});
