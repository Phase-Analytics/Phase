import { Stack } from "expo-router";

import { useTheme } from "@/hooks/use-theme";

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
          presentation: "formSheet",
          title: "Apps",
          sheetAllowedDetents: [0.5, 0.85],
          sheetGrabberVisible: true,
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="links/create"
        options={{
          presentation: "formSheet",
          title: "New link",
          sheetAllowedDetents: [0.65, 0.95],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
