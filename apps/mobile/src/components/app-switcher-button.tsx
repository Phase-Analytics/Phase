import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";

export function AppSwitcherButton() {
  const theme = useTheme();
  const router = useRouter();
  const { selectedApp } = useSelectedApp();

  return (
    <Pressable
      onPress={() => router.push("/apps/switcher")}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed
            ? theme.backgroundSelected
            : theme.backgroundElement,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View>
        <Text style={[styles.label, { color: theme.textSecondary }]}>App</Text>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {selectedApp?.name ?? "Select app"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    maxWidth: 160,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
});
