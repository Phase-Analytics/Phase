import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_NAME = "Phase";
const APP_SLUG = "phase";
const APP_SCHEME = "phase";
const BUNDLE_ID = "sh.phase.app";

export default function createExpoConfig({
  config,
}: ConfigContext): ExpoConfig {
  const appleTeamId = process.env.APPLE_TEAM_ID?.trim();

  return {
    ...config,
    name: APP_NAME,
    slug: APP_SLUG,
    version: "0.0.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: APP_SCHEME,
    userInterfaceStyle: "dark",
    backgroundColor: "#0A0A0A",
    ios: {
      ...config.ios,
      icon: "./assets/expo.icon",
      bundleIdentifier: BUNDLE_ID,
      buildNumber: "1",
      supportsTablet: false,
      backgroundColor: "#0A0A0A",
      ...(appleTeamId !== undefined && appleTeamId.length > 0
        ? { appleTeamId }
        : {}),
    },
    android: {
      ...config.android,
      package: BUNDLE_ID,
      backgroundColor: "#0A0A0A",
      adaptiveIcon: {
        backgroundColor: "#000000",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0A0A0A",
          image: "./assets/images/splash.png",
          resizeMode: "contain",
          enableFullScreenImage_legacy: true,
        },
      ],
      "expo-secure-store",
      "expo-sqlite",
      "expo-localization",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#000000",
        },
      ],
      "./plugins/with-android-signing.cjs",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
}
