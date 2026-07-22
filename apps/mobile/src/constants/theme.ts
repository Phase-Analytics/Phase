import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#0A0A0A",
    background: "#FAFAFA",
    backgroundElement: "#F0F0F0",
    backgroundSelected: "#E5E5E5",
    textSecondary: "#737373",
    border: "#E5E5E5",
    danger: "#DC2626",
  },
  dark: {
    text: "#FAFAFA",
    background: "#0A0A0A",
    backgroundElement: "#171717",
    backgroundSelected: "#262626",
    textSecondary: "#A3A3A3",
    border: "#262626",
    danger: "#F87171",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
