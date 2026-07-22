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
import { useLink, useLinkAnalytics } from "@/lib/api/queries/links";
import { formatNumber, formatRelative } from "@/lib/format";

export default function LinkDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedAppId } = useSelectedApp();
  const link = useLink(selectedAppId ?? "", id ?? "");
  const analytics = useLinkAnalytics(selectedAppId ?? "", id ?? "");

  if (!selectedAppId || !id) {
    return (
      <Screen>
        <EmptyState title="Missing link" />
      </Screen>
    );
  }

  if (link.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (link.isError || !link.data) {
    return (
      <Screen>
        <ErrorState message={link.error?.message || "Link not found"} />
      </Screen>
    );
  }

  const data = link.data;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={[styles.title, { color: theme.text }]}>
          {data.name || data.slug}
        </Text>
        <Text style={[styles.slug, { color: theme.textSecondary }]} selectable>
          {data.shortUrl}
        </Text>
        <Text style={[styles.url, { color: theme.text }]} selectable>
          {data.destinationUrl}
        </Text>

        <View style={styles.stats}>
          <StatCard
            label="Clicks"
            value={formatNumber(
              analytics.data?.totalClicks ?? data.totalClicks ?? 0
            )}
          />
          <StatCard
            label="Created"
            value={formatRelative(data.createdAt)}
          />
        </View>

        {data.disabledAt ? (
          <Text style={[styles.badge, { color: theme.danger }]}>Disabled</Text>
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  slug: { fontSize: 14 },
  url: { fontSize: 15 },
  stats: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  badge: {
    fontSize: 14,
    fontWeight: "600",
  },
});
