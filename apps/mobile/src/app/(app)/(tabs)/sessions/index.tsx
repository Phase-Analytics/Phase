import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { ChartBlock } from "@/components/chart-block";
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  MetaChips,
  PaginationBar,
  RowIcon,
  Screen,
  SectionLabel,
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
  getDisplayName,
  sessionRowSymbol,
} from "@/lib/display";
import {
  chartMonthRange,
  formatDuration,
  formatNumber,
  formatRelative,
  PAGE_SIZE,
} from "@/lib/format";
import { useTrackScreen } from "@/hooks/use-track-screen";
import { track } from "@/lib/analytics";

export default function SessionsScreen() {
  const router = useRouter();
  const { selectedAppId, isLoading: appsLoading } = useSelectedApp();
  useTrackScreen("screen_sessions", { app_id: selectedAppId ?? null });
  const range = chartMonthRange();
  const [page, setPage] = useState(1);

  const overview = useSessionOverview(selectedAppId ?? "");
  const timeseries = useSessionTimeseries(
    selectedAppId ?? "",
    range,
    "daily_sessions"
  );
  const sessions = useSessions(selectedAppId ?? "", {
    page: String(page),
    pageSize: String(PAGE_SIZE),
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

  const totalPages = sessions.data?.pagination.totalPages ?? 1;

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
            <ChartBlock data={chartData} />
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
            leading={<RowIcon name={sessionRowSymbol()} />}
            meta={formatRelative(item.lastActivityAt)}
            onPress={() => {
              void track("session_opened", { session_id: item.sessionId });
              router.push({
                pathname: "/(app)/sessions/[id]",
                params: {
                  id: item.sessionId,
                  deviceId: item.deviceId,
                  platform: item.platform ?? "",
                  country: item.country ?? "",
                  startedAt: item.startedAt,
                  lastActivityAt: item.lastActivityAt,
                },
              } as unknown as Href);
            }}
            subtitle={
              <MetaChips
                country={countryDisplayName(item.country)}
                flag={countryFlagEmoji(item.country)}
                platform={item.platform}
              />
            }
            title={getDisplayName(item.deviceId)}
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
  list: {
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
});
