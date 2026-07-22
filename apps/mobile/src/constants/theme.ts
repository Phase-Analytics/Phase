import { Platform } from "react-native";

export const Colors = {
  text: "#FAFAFA",
  background: "#0A0A0A",
  backgroundElement: "#171717",
  backgroundSelected: "#262626",
  textSecondary: "#A3A3A3",
  border: "#2A2A2A",
  danger: "#F87171",
  accent: "#FAFAFA",
} as const;

export type ThemeColor = keyof typeof Colors;

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
