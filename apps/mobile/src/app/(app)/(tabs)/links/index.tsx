import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
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
            leading={
              <SymbolView
                name="link"
                size={16}
                tintColor={theme.textSecondary}
                weight="medium"
              />
            }
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
