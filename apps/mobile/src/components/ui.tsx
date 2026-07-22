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
import { PlatformIcon } from "@/components/brand-icons";

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
    change === undefined || change === 0
      ? theme.textSecondary
      : change > 0
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
          {change === 0
            ? "No change"
            : `${change > 0 ? "+" : ""}${Math.round(change)}`}
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
  meta?: ReactNode;
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
      {typeof meta === "string" ? (
        <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>
          {meta}
        </Text>
      ) : (
        meta
      )}
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

  return (
    <View style={styles.chips}>
      <View style={styles.chip}>
        <PlatformIcon platform={platform} size={13} />
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

export function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
      {children}
    </Text>
  );
}

export function RowIcon({
  name,
}: {
  name: import("@/lib/display").RowSymbol;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.iconBubble, { backgroundColor: theme.backgroundElement }]}>
      <SymbolView
        name={name}
        size={14}
        tintColor={theme.text}
        weight="medium"
      />
    </View>
  );
}

export function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  if (totalPages <= 1) {
    return null;
  }

  return (
    <View style={styles.pagination}>
      <Pressable
        disabled={page <= 1}
        onPress={onPrev}
        style={({ pressed }) => [
          styles.pageBtn,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            opacity: page <= 1 ? 0.4 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text style={[styles.pageBtnText, { color: theme.text }]}>Prev</Text>
      </Pressable>
      <Text style={[styles.pageMeta, { color: theme.textSecondary }]}>
        {page} / {totalPages}
      </Text>
      <Pressable
        disabled={page >= totalPages}
        onPress={onNext}
        style={({ pressed }) => [
          styles.pageBtn,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            opacity: page >= totalPages ? 0.4 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text style={[styles.pageBtnText, { color: theme.text }]}>Next</Text>
      </Pressable>
    </View>
  );
}

export function RankList({
  title,
  items,
}: {
  title: string;
  items: {
    label: string;
    count: number;
    leading?: ReactNode;
  }[];
}) {
  const theme = useTheme();
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.rankBlock}>
      <SectionLabel>{title}</SectionLabel>
      <View style={styles.rankList}>
        {items.map((item) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <View key={item.label} style={styles.rankRow}>
              <View style={styles.rankHead}>
                <View style={styles.rankLabelWrap}>
                  {item.leading}
                  <Text
                    numberOfLines={1}
                    style={[styles.rankLabel, { color: theme.text }]}
                  >
                    {item.label}
                  </Text>
                </View>
                <Text style={[styles.rankCount, { color: theme.textSecondary }]}>
                  {item.count.toLocaleString("en-US")}
                </Text>
              </View>
              <View
                style={[
                  styles.rankTrack,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                <View
                  style={[
                    styles.rankFill,
                    {
                      backgroundColor: theme.text,
                      width: `${pct}%`,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: import("@/lib/display").RowSymbol | "iphone" | "globe" | "internaldrive" | "calendar" | "clock";
  label: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.iconBubble, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView
          name={icon}
          size={14}
          tintColor={theme.textSecondary}
          weight="medium"
        />
      </View>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>
        {value}
      </Text>
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
    width: 32,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pageMeta: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  rankBlock: {
    gap: Spacing.two,
  },
  rankList: {
    gap: 10,
  },
  rankRow: {
    gap: 6,
  },
  rankHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  rankLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  rankLabel: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  rankCount: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  rankTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  rankFill: {
    height: "100%",
    borderRadius: 2,
    opacity: 0.85,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 13,
    width: 88,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
  },
});
