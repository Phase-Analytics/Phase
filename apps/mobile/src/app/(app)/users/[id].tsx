import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  StatCard,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import { useDevice } from "@/lib/api/queries/devices";
import { formatRelative } from "@/lib/format";

export default function UserDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedAppId } = useSelectedApp();
  const device = useDevice(id ?? "", selectedAppId ?? "");

  if (!selectedAppId || !id) {
    return (
      <Screen>
        <EmptyState title="Missing user" />
      </Screen>
    );
  }

  if (device.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (device.isError || !device.data) {
    return (
      <Screen>
        <ErrorState message={device.error?.message || "User not found"} />
      </Screen>
    );
  }

  const d = device.data;
  const properties = d.properties
    ? Object.entries(d.properties).slice(0, 20)
    : [];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={[styles.id, { color: theme.text }]} selectable>
          {d.deviceId}
        </Text>
        <View style={styles.stats}>
          <StatCard label="Platform" value={d.platform ?? "—"} />
          <StatCard label="Country" value={d.country ?? "—"} />
        </View>
        <View style={styles.stats}>
          <StatCard label="Model" value={d.model ?? "—"} />
          <StatCard label="OS" value={d.osVersion ?? "—"} />
        </View>
        <View style={styles.meta}>
          <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>
            First seen
          </Text>
          <Text style={[styles.metaValue, { color: theme.text }]}>
            {formatRelative(d.firstSeen)}
          </Text>
          <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>
            Last activity
          </Text>
          <Text style={[styles.metaValue, { color: theme.text }]}>
            {formatRelative(d.lastActivityAt)}
          </Text>
        </View>
        {properties.length > 0 ? (
          <View style={styles.props}>
            <Text style={[styles.section, { color: theme.textSecondary }]}>
              Properties
            </Text>
            {properties.map(([key, value]) => (
              <View key={key} style={styles.propRow}>
                <Text style={[styles.propKey, { color: theme.textSecondary }]}>
                  {key}
                </Text>
                <Text style={[styles.propValue, { color: theme.text }]}>
                  {String(value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  id: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "ui-monospace",
  },
  stats: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  meta: { gap: Spacing.one },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: Spacing.two,
  },
  metaValue: { fontSize: 16 },
  props: { gap: Spacing.two, marginTop: Spacing.two },
  section: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  propRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  propKey: { fontSize: 14, flex: 1 },
  propValue: { fontSize: 14, fontWeight: "500", flex: 1, textAlign: "right" },
});
