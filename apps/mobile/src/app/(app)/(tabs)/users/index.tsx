import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { PlatformIcon } from "@/components/brand-icons";
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
import {
  useDeviceOverview,
  useDevices,
  useDeviceTimeseries,
} from "@/lib/api/queries/devices";
import {
  countryDisplayName,
  countryFlagEmoji,
  getDisplayName,
  platformLabel,
  topEntries,
  userRowSymbol,
} from "@/lib/display";
import {
  chartMonthRange,
  formatNumber,
  formatRelative,
  PAGE_SIZE,
} from "@/lib/format";
import { useTrackScreen } from "@/hooks/use-track-screen";
import { track } from "@/lib/analytics";

export default function UsersScreen() {
  const router = useRouter();
  const { selectedAppId, isLoading: appsLoading } = useSelectedApp();
  useTrackScreen("screen_users", {
    app_id: selectedAppId ?? null,
  });
  const range = chartMonthRange();
  const [page, setPage] = useState(1);

  const overview = useDeviceOverview(selectedAppId ?? "");
  const timeseries = useDeviceTimeseries(selectedAppId ?? "", range, "total");
  const devices = useDevices(selectedAppId ?? "", {
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });

  const { refreshing, onRefresh } = useQueryRefresh(
    overview,
    devices,
    timeseries
  );

  if (appsLoading || (!selectedAppId && !appsLoading)) {
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
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (overview.isError || devices.isError) {
    return (
      <Screen>
        <ErrorState
          message={
            overview.error?.message ||
            devices.error?.message ||
            "Failed to load users"
          }
        />
      </Screen>
    );
  }

  const chartData =
    timeseries.data?.data.map((point) => ({
      date: point.date,
      value: point.totalUsers ?? point.activeUsers ?? 0,
    })) ?? [];

  const platforms = topEntries(overview.data?.platformStats, 4).map((item) => ({
    label: platformLabel(item.key),
    count: item.count,
    leading: <PlatformIcon platform={item.key} size={14} />,
  }));

  const countries = topEntries(overview.data?.countryStats, 5).map((item) => ({
    label: countryDisplayName(item.key) ?? item.key,
    count: item.count,
    leading: (
      <Text style={styles.flag}>{countryFlagEmoji(item.key) ?? "🌐"}</Text>
    ),
  }));

  const totalPages = devices.data?.pagination.totalPages ?? 1;

  return (
    <Screen padded={false}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.stats}>
              <StatCard
                change={overview.data?.totalDevicesChange24h}
                label="Total users"
                value={formatNumber(overview.data?.totalDevices)}
              />
              <StatCard
                change={overview.data?.activeDevicesChange24h}
                label="Active 24h"
                value={formatNumber(overview.data?.activeDevices24h)}
              />
            </View>
            <ChartBlock data={chartData} />
            <View style={styles.distributions}>
              <RankList items={platforms} title="Top platforms" />
              <RankList items={countries} title="Top countries" />
            </View>
            <SectionLabel>Recent</SectionLabel>
          </View>
        }
        ListFooterComponent={
          <PaginationBar
            onNext={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            page={page}
            totalPages={totalPages}
          />
        }
        {...refreshScrollProps}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        data={devices.data?.devices ?? []}
        keyExtractor={(item) => item.deviceId}
        ListEmptyComponent={
          devices.isLoading ? (
            <LoadingState />
          ) : (
            <EmptyState
              subtitle="Users appear when your SDK starts sending events."
              title="No users yet"
            />
          )
        }
        refreshControl={
          <QueryRefreshControl onRefresh={onRefresh} refreshing={refreshing} />
        }
        renderItem={({ item }) => {
          const flag = countryFlagEmoji(item.country);
          const country = countryDisplayName(item.country);
          return (
            <ListRow
              leading={<RowIcon name={userRowSymbol()} />}
              meta={formatRelative(item.lastSeen)}
              onPress={() => {
                void track("user_opened", { device_id: item.deviceId });
                router.push(`/(app)/users/${item.deviceId}`);
              }}
              subtitle={
                <MetaChips
                  country={country}
                  flag={flag}
                  platform={item.platform}
                />
              }
              title={getDisplayName(item.deviceId)}
            />
          );
        }}
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
  distributions: {
    gap: Spacing.four,
  },
  list: {
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
  flag: {
    fontSize: 13,
  },
});
