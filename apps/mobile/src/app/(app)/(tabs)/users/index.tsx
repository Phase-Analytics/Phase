import { useRouter } from "expo-router";
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
  useDeviceOverview,
  useDevices,
  useDeviceTimeseries,
} from "@/lib/api/queries/devices";
import {
  countryDisplayName,
  countryFlagEmoji,
} from "@/lib/display";
import { formatNumber, formatRelative, lastNDaysRange } from "@/lib/format";

export default function UsersScreen() {
  const router = useRouter();
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
              <TimeseriesChart dark data={chartData} height={200} />
            </View>
            <Text style={styles.section}>Recent</Text>
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
        renderItem={({ item }) => {
          const flag = countryFlagEmoji(item.country);
          const country = countryDisplayName(item.country);
          return (
            <ListRow
              leading={
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(item.deviceId || "?").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              }
              meta={formatRelative(item.lastSeen)}
              onPress={() => router.push(`/(app)/users/${item.deviceId}`)}
              subtitle={
                <MetaChips
                  country={country}
                  flag={flag}
                  platform={item.platform}
                />
              }
              title={item.deviceId}
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
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#262626",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FAFAFA",
  },
});
