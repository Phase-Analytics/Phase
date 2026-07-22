import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import TimeseriesChart from "@/components/charts/timeseries-chart";
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  MetaChips,
  Screen,
  StatCard,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import {
  useSessionOverview,
  useSessions,
  useSessionTimeseries,
} from "@/lib/api/queries/sessions";
import {
  countryDisplayName,
  countryFlagEmoji,
} from "@/lib/display";
import {
  formatDuration,
  formatNumber,
  formatRelative,
  lastNDaysRange,
} from "@/lib/format";

export default function SessionsScreen() {
  const { selectedAppId, isLoading: appsLoading } = useSelectedApp();
  const range = lastNDaysRange(14);

  const overview = useSessionOverview(selectedAppId ?? "");
  const timeseries = useSessionTimeseries(selectedAppId ?? "", range);
  const sessions = useSessions(selectedAppId ?? "", {
    page: "1",
    pageSize: "50",
  });

  const refreshing =
    overview.isRefetching || sessions.isRefetching || timeseries.isRefetching;

  if (!selectedAppId && !appsLoading) {
    return (
      <Screen>
        <EmptyState
          subtitle="Create an app on the web, then select it here."
          title="No apps yet"
        />
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

  if (overview.isError || sessions.isError) {
    return (
      <Screen>
        <ErrorState
          message={
            overview.error?.message ||
            sessions.error?.message ||
            "Failed to load sessions"
          }
        />
      </Screen>
    );
  }

  const chartData =
    timeseries.data?.data.map((point) => ({
      date: point.date,
      value: point.dailySessions ?? 0,
    })) ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.stats}>
              <StatCard
                change={overview.data?.totalSessionsChange24h}
                label="Total"
                value={formatNumber(overview.data?.totalSessions)}
              />
              <StatCard
                change={overview.data?.activeSessions24hChange}
                label="Active 24h"
                value={formatNumber(overview.data?.activeSessions24h)}
              />
            </View>
            <View style={styles.stats}>
              <StatCard
                label="Avg duration"
                value={formatDuration(overview.data?.averageSessionDuration)}
              />
              <StatCard
                label="Bounce rate"
                value={`${(overview.data?.bounceRate ?? 0).toFixed(0)}%`}
              />
            </View>
            <View style={styles.chart}>
              <TimeseriesChart dark data={chartData} height={200} />
            </View>
            <Text style={styles.section}>Recent</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        data={sessions.data?.sessions ?? []}
        keyExtractor={(item) => item.sessionId}
        ListEmptyComponent={
          sessions.isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState title="No sessions yet" />
          )
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void overview.refetch();
              void sessions.refetch();
              void timeseries.refetch();
            }}
            refreshing={refreshing}
          />
        }
        renderItem={({ item }) => (
          <ListRow
            meta={formatRelative(item.lastActivityAt)}
            subtitle={
              <MetaChips
                country={countryDisplayName(item.country)}
                flag={countryFlagEmoji(item.country)}
                platform={item.platform}
              />
            }
            title={item.sessionId}
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
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
  },
  section: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    opacity: 0.55,
    marginTop: Spacing.one,
  },
  list: {
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
});
