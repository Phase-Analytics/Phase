import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import TimeseriesChart from "@/components/charts/timeseries-chart";
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatCard,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import {
  useEventOverview,
  useEvents,
  useEventTimeseries,
  useTopEvents,
} from "@/lib/api/queries/events";
import { formatNumber, formatRelative, lastNDaysRange } from "@/lib/format";

export default function ActivityScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { selectedAppId, isLoading: appsLoading } = useSelectedApp();
  const range = lastNDaysRange(14);

  const overview = useEventOverview(selectedAppId ?? "");
  const timeseries = useEventTimeseries(selectedAppId ?? "", range);
  const top = useTopEvents(selectedAppId ?? "", range);
  const events = useEvents(selectedAppId ?? "", { page: "1", pageSize: "40" });

  const refreshing =
    overview.isRefetching || events.isRefetching || timeseries.isRefetching;

  if (!selectedAppId && !appsLoading) {
    return (
      <Screen>
        <EmptyState title="No apps yet" />
      </Screen>
    );
  }

  if (appsLoading || overview.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (overview.isError || events.isError) {
    return (
      <Screen>
        <ErrorState
          message={
            overview.error?.message ||
            events.error?.message ||
            "Failed to load activity"
          }
        />
      </Screen>
    );
  }

  const chartData =
    timeseries.data?.data.map((point) => ({
      date: point.date,
      value: point.dailyEvents,
    })) ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.stats}>
              <StatCard
                change={overview.data?.totalEventsChange24h}
                label="Total events"
                value={formatNumber(overview.data?.totalEvents)}
              />
              <StatCard
                change={overview.data?.events24hChange}
                label="Events 24h"
                value={formatNumber(overview.data?.events24h)}
              />
            </View>
            <View style={styles.chart}>
              <TimeseriesChart
                dark={scheme === "dark"}
                data={chartData}
                dom={{ matchContents: true }}
              />
            </View>
            {(top.data?.events?.length ?? 0) > 0 ? (
              <View style={styles.topBlock}>
                <Text style={[styles.section, { color: theme.textSecondary }]}>
                  Top events
                </Text>
                {top.data?.events.slice(0, 5).map((event) => (
                  <View key={event.name} style={styles.topRow}>
                    <Text style={[styles.topName, { color: theme.text }]}>
                      {event.name}
                    </Text>
                    <Text
                      style={[styles.topCount, { color: theme.textSecondary }]}
                    >
                      {formatNumber(event.count)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={[styles.section, { color: theme.textSecondary }]}>
              Recent
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        data={events.data?.events ?? []}
        keyExtractor={(item) => item.eventId}
        ListEmptyComponent={
          events.isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState title="No events yet" />
          )
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void overview.refetch();
              void events.refetch();
              void timeseries.refetch();
              void top.refetch();
            }}
            refreshing={refreshing}
          />
        }
        renderItem={({ item }) => (
          <ListRow
            meta={formatRelative(item.timestamp)}
            subtitle={item.deviceId}
            title={item.name}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  stats: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  chart: {
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
  },
  topBlock: { gap: Spacing.two },
  section: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  topName: { fontSize: 15, fontWeight: "500" },
  topCount: { fontSize: 14, fontVariant: ["tabular-nums"] },
  list: {
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
});
