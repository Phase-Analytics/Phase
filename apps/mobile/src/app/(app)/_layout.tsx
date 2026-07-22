import { Stack } from "expo-router";

import { useTheme } from "@/hooks/use-theme";

const sheetOptions = {
  presentation: "formSheet" as const,
  sheetAllowedDetents: [0.5, 0.72] as number[],
  sheetGrabberVisible: true,
  sheetCornerRadius: 16,
  headerShadowVisible: false,
};

export default function AppLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="users/[id]"
        options={{ title: "User", headerBackTitle: "Users" }}
      />
      <Stack.Screen
        name="links/[id]"
        options={{ title: "Link", headerBackTitle: "Links" }}
      />
      <Stack.Screen
        name="domains/index"
        options={{ title: "Domains", headerBackTitle: "Links" }}
      />
      <Stack.Screen
        name="apps/switcher"
        options={{
          ...sheetOptions,
          title: "Apps",
        }}
      />
    </Stack>
  );
}
