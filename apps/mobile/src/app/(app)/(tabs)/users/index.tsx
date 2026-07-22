import { useRouter } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

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
import { useSelectedApp } from "@/hooks/use-selected-app";
import {
  useDeviceOverview,
  useDevices,
  useDeviceTimeseries,
} from "@/lib/api/queries/devices";
import { formatNumber, formatRelative, lastNDaysRange } from "@/lib/format";

export default function UsersScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const { selectedAppId, isLoading: appsLoading } = useSelectedApp();
  const range = lastNDaysRange(14);

  const overview = useDeviceOverview(selectedAppId ?? "");
  const timeseries = useDeviceTimeseries(selectedAppId ?? "", range);
  const devices = useDevices(selectedAppId ?? "", {
    page: "1",
    pageSize: "50",
  });

  const refreshing =
    overview.isRefetching || devices.isRefetching || timeseries.isRefetching;

  function onRefresh() {
    void overview.refetch();
    void devices.refetch();
    void timeseries.refetch();
  }

  if (appsLoading || (!selectedAppId && !appsLoading)) {
    if (!selectedAppId && !appsLoading) {
      return (
        <Screen>
          <EmptyState
            subtitle="Create an app on the web or in the app switcher."
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
      value: point.activeUsers ?? point.totalUsers ?? 0,
    })) ?? [];

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
            <View style={styles.chart}>
              <TimeseriesChart
                dark={scheme === "dark"}
                data={chartData}
                dom={{ matchContents: true }}
              />
            </View>
          </View>
        }
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
          <RefreshControl onRefresh={onRefresh} refreshing={refreshing} />
        }
        renderItem={({ item }) => (
          <ListRow
            meta={formatRelative(item.lastSeen)}
            onPress={() => router.push(`/(app)/users/${item.deviceId}`)}
            subtitle={
              [item.platform, item.country].filter(Boolean).join(" · ") ||
              "Unknown"
            }
            title={item.deviceId}
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
  list: {
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
});
