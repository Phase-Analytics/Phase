import { Stack, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

import { AppSwitcherButton } from "@/components/app-switcher-button";
import { useTheme } from "@/hooks/use-theme";

export default function LinksTabLayout() {
  const theme = useTheme();
  const router = useRouter();

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
      <Stack.Screen
        name="index"
        options={{
          title: "Links",
          headerLeft: () => (
            <Pressable
              onPress={() => router.push("/(app)/domains")}
              style={{ paddingHorizontal: 4 }}
            >
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "500" }}>
                Domains
              </Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
