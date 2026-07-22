import { Stack } from "expo-router";

import { AppSwitcherButton } from "@/components/app-switcher-button";
import { useTheme } from "@/hooks/use-theme";

const tabStackOptions = {
  headerLargeTitle: true,
  headerShadowVisible: false,
  headerTitleAlign: "center" as const,
  headerTitle: () => <AppSwitcherButton />,
};

export default function LinksTabLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        ...tabStackOptions,
        headerStyle: { backgroundColor: theme.background },
        headerLargeStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Links" }} />
    </Stack>
  );
}
