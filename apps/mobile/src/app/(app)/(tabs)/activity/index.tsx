import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { ChartBlock } from "@/components/chart-block";
import {
  QueryRefreshControl,
  refreshScrollProps,
  useQueryRefresh,
} from "@/components/scroll-refresh";
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  MetaChips,
  PaginationBar,
  RankList,
  RowIcon,
  Screen,
  SectionLabel,
  StatCard,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import {
  useEventOverview,
  useEvents,
  useEventTimeseries,
  useTopEvents,
} from "@/lib/api/queries/events";
import { eventRowSymbol } from "@/lib/display";
import {
  chartMonthRange,
  formatNumber,
  formatRelative,
  PAGE_SIZE,
} from "@/lib/format";
import { useTrackScreen } from "@/hooks/use-track-screen";

export default function ActivityScreen() {
  const theme = useTheme();
  const { selectedAppId, isLoading: appsLoading } = useSelectedApp();
  useTrackScreen("screen_activity", { app_id: selectedAppId ?? null });
  const range = chartMonthRange();
  const [page, setPage] = useState(1);

  const overview = useEventOverview(selectedAppId ?? "");
  const timeseries = useEventTimeseries(selectedAppId ?? "", range);
  const top = useTopEvents(selectedAppId ?? "", range);
  const events = useEvents(selectedAppId ?? "", {
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });

  const { refreshing, onRefresh } = useQueryRefresh(
    overview,
    events,
    timeseries,
    top
  );

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
      value: point.dailyEvents ?? 0,
    })) ?? [];

  const topItems =
    top.data?.events.slice(0, 6).map((event) => ({
      label: event.name,
      count: event.count,
    })) ?? [];

  const totalPages = events.data?.pagination.totalPages ?? 1;

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
            {timeseries.isError ? (
              <Text style={[styles.chartError, { color: theme.danger }]}>
                Chart failed to load
              </Text>
            ) : (
              <ChartBlock data={chartData} />
            )}
            <RankList items={topItems} title="Top events" />
            <SectionLabel>Recent</SectionLabel>
          </View>
        }
        ListFooterComponent={
          <PaginationBar
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            page={page}
            totalPages={totalPages}
          />
        }
        {...refreshScrollProps}
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
          <QueryRefreshControl onRefresh={onRefresh} refreshing={refreshing} />
        }
        renderItem={({ item }) => (
          <ListRow
            leading={<RowIcon name={eventRowSymbol(item.isScreen)} />}
            meta={formatRelative(item.timestamp)}
            subtitle={<MetaChips platform={item.platform} />}
            title={item.isScreen ? `View ${item.name}` : item.name}
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
  chartError: {
    fontSize: 13,
    fontWeight: "500",
  },
  list: {
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
});
