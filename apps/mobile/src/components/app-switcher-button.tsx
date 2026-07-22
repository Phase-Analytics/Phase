import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";

export function AppSwitcherButton() {
  const theme = useTheme();
  const router = useRouter();
  const { selectedApp, isLoading } = useSelectedApp();

  return (
    <Pressable
      accessibilityLabel="Switch app"
      hitSlop={8}
      onPress={() => router.push("/(app)/apps/switcher")}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed
            ? theme.backgroundSelected
            : theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}
      >
        <Text style={[styles.avatarText, { color: theme.text }]}>
          {(selectedApp?.name ?? "P").slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
        {isLoading ? "…" : (selectedApp?.name ?? "Apps")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    maxWidth: 180,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
  },
  name: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
  },
});
