import { useRouter } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { CursorIcon } from "@/components/brand-icons";
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  RowIcon,
  Screen,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import { useLinks } from "@/lib/api/queries/links";
import { formatNumber } from "@/lib/format";
import { useTrackScreen } from "@/hooks/use-track-screen";
import { track } from "@/lib/analytics";

export default function LinksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { selectedAppId, isLoading: appsLoading } = useSelectedApp();
  useTrackScreen("screen_links", { app_id: selectedAppId ?? null });
  const links = useLinks(selectedAppId ?? "");

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

  if (appsLoading || links.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (links.isError) {
    return (
      <Screen>
        <ErrorState message={links.error.message || "Failed to load links"} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        data={links.data?.links ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            subtitle="Create short links on the web."
            title="No links yet"
          />
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void links.refetch()}
            refreshing={links.isRefetching}
          />
        }
        renderItem={({ item }) => (
          <ListRow
            leading={<RowIcon name="link" />}
            meta={
              <View style={styles.clicksMeta}>
                <CursorIcon framed={false} size={12} />
                <Text style={[styles.clicksText, { color: theme.textSecondary }]}>
                  {formatNumber(item.totalClicks ?? 0)} clicks
                </Text>
              </View>
            }
            onPress={() => {
              void track("link_opened", { link_id: item.id });
              router.push(`/(app)/links/${item.id}`);
            }}
            subtitle={item.destinationUrl}
            title={item.name || item.slug}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
  clicksMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clicksText: {
    fontSize: 12,
  },
});
