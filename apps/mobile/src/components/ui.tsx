import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { platformLabel } from "@/lib/display";

export function Screen({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.background },
        padded && styles.padded,
      ]}
    >
      {children}
    </View>
  );
}

export function LoadingState() {
  const theme = useTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={theme.text} />
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.centered, compact && styles.centeredCompact]}>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.centered, compact && styles.centeredCompact]}>
      <Text style={[styles.emptyTitle, { color: theme.danger }]}>{message}</Text>
    </View>
  );
}

export function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string | number;
  change?: number;
}) {
  const theme = useTheme();
  const changeColor =
    change === undefined
      ? theme.textSecondary
      : change >= 0
        ? "#16A34A"
        : theme.danger;

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      {change !== undefined ? (
        <Text style={[styles.statChange, { color: changeColor }]}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}%
        </Text>
      ) : null}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  meta,
  leading,
  onPress,
}: {
  title: string;
  subtitle?: ReactNode;
  meta?: string;
  leading?: ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? theme.backgroundSelected
            : theme.background,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        {typeof subtitle === "string" ? (
          <Text
            numberOfLines={1}
            style={[styles.rowSubtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {meta ? (
        <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MetaChips({
  platform,
  country,
  flag,
}: {
  platform?: string | null;
  country?: string | null;
  flag?: string | null;
}) {
  const theme = useTheme();
  const normalized = platform?.toLowerCase();
  const symbol =
    normalized === "ios"
      ? "iphone"
      : normalized === "android"
        ? "candybarphone"
        : "questionmark.circle";

  return (
    <View style={styles.chips}>
      <View style={styles.chip}>
        <SymbolView
          name={symbol}
          size={13}
          tintColor={theme.textSecondary}
          weight="medium"
        />
        <Text style={[styles.chipText, { color: theme.textSecondary }]}>
          {platformLabel(platform)}
        </Text>
      </View>
      {country ? (
        <View style={styles.chip}>
          {flag ? <Text style={styles.flag}>{flag}</Text> : null}
          <Text style={[styles.chipText, { color: theme.textSecondary }]}>
            {country}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const theme = useTheme();
  const backgroundColor =
    variant === "primary"
      ? theme.text
      : variant === "danger"
        ? theme.danger
        : theme.backgroundElement;
  const color = variant === "primary" ? theme.background : theme.text;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "url" | "numeric";
}) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
    gap: Spacing.two,
  },
  centeredCompact: {
    flex: 0,
    paddingVertical: Spacing.four,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  statCard: {
    flex: 1,
    minWidth: "40%",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statChange: {
    fontSize: 10,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  leading: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMain: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 12,
  },
  rowMeta: {
    fontSize: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: {
    fontSize: 12,
  },
  flag: {
    fontSize: 13,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  field: {
    gap: Spacing.one,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
  },
});
