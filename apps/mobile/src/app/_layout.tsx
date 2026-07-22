import { Stack, useRouter, useSegments } from "expo-router";
import {
  DarkTheme,
  ThemeProvider,
  type Theme,
} from "expo-router/react-navigation";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth-client";
import { AppProviders } from "@/providers/app-providers";

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.text,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.danger,
  },
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (isPending) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (session && inAuthGroup) {
      router.replace("/(app)/(tabs)/users");
    }
  }, [session, isPending, segments, router]);

  if (isPending) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  return children;
}

export default function RootLayout() {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(Colors.background);
  }, []);

  return (
    <AppProviders>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: "fade",
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="index" />
          </Stack>
        </AuthGate>
      </ThemeProvider>
    </AppProviders>
  );
}
