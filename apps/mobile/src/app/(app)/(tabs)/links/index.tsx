import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  PrimaryButton,
  Screen,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import { useLinks } from "@/lib/api/queries/links";
import { formatNumber } from "@/lib/format";
import { signOut } from "@/lib/auth-client";

export default function LinksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { selectedAppId, isLoading: appsLoading } = useSelectedApp();
  const links = useLinks(selectedAppId ?? "");

  if (!selectedAppId && !appsLoading) {
    return (
      <Screen>
        <EmptyState title="No apps yet" />
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
        ListHeaderComponent={
          <View style={styles.header}>
            <PrimaryButton
              label="Create link"
              onPress={() => router.push("/(app)/links/create")}
            />
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              onPress={() => void signOut()}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.signOut, { color: theme.danger }]}>
                Sign out
              </Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        data={links.data?.links ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            subtitle="Create a short link to get started."
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
            meta={`${formatNumber(item.totalClicks ?? 0)} clicks`}
            onPress={() => router.push(`/(app)/links/${item.id}`)}
            subtitle={item.destinationUrl}
            title={item.name || item.slug}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  list: {
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
  footer: {
    padding: Spacing.four,
    alignItems: "center",
  },
  signOut: {
    fontSize: 15,
    fontWeight: "600",
  },
});
