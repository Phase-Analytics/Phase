import { Ionicons } from "@expo/vector-icons";
import {
  AndroidIcon,
  AnonymousIcon,
  AppleFinderIcon,
  AppleIcon,
  BrowserIcon,
  CommandIcon,
  CursorPointer02Icon,
  Link05Icon,
  WindowsOldIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import {
  formatLinkBrowserFamilyLabel,
  getLinkOsLabel,
  getLinkReferrerLabel,
  normalizeLinkBrowserFamily,
  normalizeOsKey,
  normalizeReferrerKey,
} from "@phase/shared";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export function HugeIcon({
  icon,
  size = 14,
  color,
}: {
  icon: IconSvgElement;
  size?: number;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <HugeiconsIcon
      color={color ?? theme.textSecondary}
      icon={icon}
      size={size}
      strokeWidth={1.5}
    />
  );
}

export function platformHugeIcon(platform: string | null | undefined) {
  const key = platform?.toLowerCase();
  if (key === "android") {
    return AndroidIcon;
  }
  if (key === "ios") {
    return AppleIcon;
  }
  return AnonymousIcon;
}

export function PlatformIcon({
  platform,
  size = 14,
}: {
  platform: string | null | undefined;
  size?: number;
}) {
  return <HugeIcon icon={platformHugeIcon(platform)} size={size} />;
}

export function linkOsIcon(key: string) {
  switch (normalizeOsKey(key)) {
    case "windows":
      return WindowsOldIcon;
    case "macos":
      return AppleFinderIcon;
    case "android":
      return AndroidIcon;
    case "ios":
      return AppleIcon;
    case "linux":
      return CommandIcon;
    default:
      return AnonymousIcon;
  }
}

export function LinkOsIcon({ os, size = 14 }: { os: string; size?: number }) {
  return <HugeIcon icon={linkOsIcon(os)} size={size} />;
}

export function LinkBrowserGlyph({
  browser,
  size = 14,
}: {
  browser: string;
  size?: number;
}) {
  const theme = useTheme();
  const family = normalizeLinkBrowserFamily(browser);
  if (family === "chrome") {
    return (
      <Ionicons color={theme.textSecondary} name="logo-chrome" size={size} />
    );
  }
  if (family === "firefox") {
    return (
      <Ionicons color={theme.textSecondary} name="logo-firefox" size={size} />
    );
  }
  if (family === "safari") {
    return (
      <Ionicons color={theme.textSecondary} name="compass-outline" size={size} />
    );
  }
  return <HugeIcon icon={BrowserIcon} size={size} />;
}

export function LinkReferrerIcon({ size = 14 }: { size?: number }) {
  return <HugeIcon icon={Link05Icon} size={size} />;
}

export function CursorIcon({
  size = 14,
  framed = true,
}: {
  size?: number;
  framed?: boolean;
}) {
  const theme = useTheme();
  const icon = (
    <HugeIcon color={theme.text} icon={CursorPointer02Icon} size={size} />
  );
  if (!framed) {
    return icon;
  }
  return (
    <View
      style={[styles.bubble, { backgroundColor: theme.backgroundElement }]}
    >
      {icon}
    </View>
  );
}

export function mergeBrowserBreakdown(
  items: { key: string; count: number }[]
): { key: string; count: number; label: string }[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    const bucket = normalizeLinkBrowserFamily(item.key);
    const key =
      bucket === "safari" ||
      bucket === "chrome" ||
      bucket === "firefox" ||
      bucket === "other"
        ? bucket
        : "other";
    merged.set(key, (merged.get(key) ?? 0) + item.count);
  }
  return [...merged.entries()]
    .map(([key, count]) => ({
      key,
      count,
      label: key === "other" ? "Others" : formatLinkBrowserFamilyLabel(key),
    }))
    .sort((a, b) => b.count - a.count);
}

export function mergeReferrerBreakdown(
  items: { key: string; count: number }[]
): { key: string; count: number; label: string }[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    const key = normalizeReferrerKey(item.key);
    merged.set(key, (merged.get(key) ?? 0) + item.count);
  }
  return [...merged.entries()]
    .map(([key, count]) => ({
      key,
      count,
      label: getLinkReferrerLabel(key),
    }))
    .sort((a, b) => b.count - a.count);
}

export function mergeOsBreakdown(
  items: { key: string; count: number }[]
): { key: string; count: number; label: string }[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    const key = normalizeOsKey(item.key);
    if (key === "unknown") {
      continue;
    }
    merged.set(key, (merged.get(key) ?? 0) + item.count);
  }
  return [...merged.entries()]
    .map(([key, count]) => ({
      key,
      count,
      label: getLinkOsLabel(key),
    }))
    .sort((a, b) => b.count - a.count);
}

const styles = StyleSheet.create({
  bubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
