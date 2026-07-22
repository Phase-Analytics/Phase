import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const logoSource = require("../../assets/brand/icon-512.png");

export function PhaseLogo({
  size = 56,
  showWordmark = true,
  tagline,
}: {
  size?: number;
  showWordmark?: boolean;
  tagline?: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <Image
        contentFit="contain"
        source={logoSource}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
      />
      {showWordmark ? (
        <View style={styles.text}>
          <Text style={[styles.wordmark, { color: theme.text }]}>Phase</Text>
          {tagline ? (
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              {tagline}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three,
  },
  text: {
    gap: Spacing.one,
  },
  wordmark: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1.4,
  },
  tagline: {
    fontSize: 16,
  },
});
