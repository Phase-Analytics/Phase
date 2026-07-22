import { Stack } from "expo-router";

import { AppSwitcherButton } from "@/components/app-switcher-button";
import { useTheme } from "@/hooks/use-theme";

export default function UsersTabLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
        headerRight: () => <AppSwitcherButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Users" }} />
    </Stack>
  );
}
