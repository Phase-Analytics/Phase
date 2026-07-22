import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  Screen,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import { useApps, useCreateApp } from "@/lib/api/queries/apps";

export default function AppSwitcherSheet() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, error } = useApps();
  const { selectedAppId, setSelectedAppId } = useSelectedApp();
  const createApp = useCreateApp();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={error.message} />
      </Screen>
    );
  }

  async function onCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      return;
    }
    setCreating(true);
    try {
      const app = await createApp.mutateAsync({ name: trimmed });
      setSelectedAppId(app.id);
      setName("");
      router.back();
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen>
      <FlatList
        ListFooterComponent={
          <View style={styles.create}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              New app
            </Text>
            <TextInput
              onChangeText={setName}
              placeholder="App name"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
              value={name}
            />
            <PrimaryButton
              disabled={creating || name.trim().length < 3}
              label={creating ? "Creating…" : "Create"}
              onPress={() => void onCreate()}
            />
          </View>
        }
        contentContainerStyle={styles.list}
        data={data?.apps ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState title="No apps yet" />}
        renderItem={({ item }) => {
          const selected = item.id === selectedAppId;
          return (
            <Pressable
              onPress={() => {
                setSelectedAppId(item.id);
                router.back();
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed
                    ? theme.backgroundSelected
                    : selected
                      ? theme.backgroundElement
                      : theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View>
                <Text style={[styles.name, { color: theme.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.role, { color: theme.textSecondary }]}>
                  {item.role}
                </Text>
              </View>
              {selected ? (
                <Text style={{ color: theme.text, fontWeight: "700" }}>✓</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 17, fontWeight: "600" },
  role: { fontSize: 13, marginTop: 2 },
  create: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
  },
});
