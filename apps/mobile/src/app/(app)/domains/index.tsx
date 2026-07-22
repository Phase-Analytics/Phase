import { useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
import {
  useCreateLinkDomain,
  useDeleteLinkDomain,
  useLinkDomains,
  useVerifyLinkDomain,
} from "@/lib/api/queries/links";

export default function DomainsScreen() {
  const theme = useTheme();
  const { selectedAppId, isLoading: appsLoading } = useSelectedApp();
  const domains = useLinkDomains(selectedAppId ?? "");
  const createDomain = useCreateLinkDomain();
  const verifyDomain = useVerifyLinkDomain();
  const deleteDomain = useDeleteLinkDomain();
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!selectedAppId && !appsLoading) {
    return (
      <Screen>
        <EmptyState title="No apps yet" />
      </Screen>
    );
  }

  if (appsLoading || domains.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (domains.isError) {
    return (
      <Screen>
        <ErrorState message={domains.error.message || "Failed to load domains"} />
      </Screen>
    );
  }

  async function onCreate() {
    if (!selectedAppId) {
      return;
    }
    setError(null);
    try {
      await createDomain.mutateAsync({
        appId: selectedAppId,
        hostname: hostname.trim().toLowerCase(),
      });
      setHostname("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    }
  }

  return (
    <Screen padded={false}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Add custom domain
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setHostname}
              placeholder="links.example.com"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
              value={hostname}
            />
            {error ? (
              <Text style={{ color: theme.danger }}>{error}</Text>
            ) : null}
            <PrimaryButton
              disabled={createDomain.isPending || hostname.trim().length < 4}
              label={createDomain.isPending ? "Adding…" : "Add domain"}
              onPress={() => void onCreate()}
            />
          </View>
        }
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        data={domains.data?.domains ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            subtitle="Point a CNAME at Phase to use your own domain."
            title="No domains"
          />
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void domains.refetch()}
            refreshing={domains.isRefetching}
          />
        }
        renderItem={({ item }) => (
          <View>
            <ListRow
              meta={item.status}
              subtitle={item.cnameTarget}
              title={item.hostname}
            />
            <View style={styles.actions}>
              {item.status !== "verified" ? (
                <PrimaryButton
                  disabled={verifyDomain.isPending}
                  label="Verify"
                  onPress={() => {
                    if (!selectedAppId) {
                      return;
                    }
                    void verifyDomain.mutateAsync({
                      appId: selectedAppId,
                      domainId: item.id,
                    });
                  }}
                  variant="secondary"
                />
              ) : null}
              <PrimaryButton
                disabled={deleteDomain.isPending}
                label="Remove"
                onPress={() => {
                  if (!selectedAppId) {
                    return;
                  }
                  void deleteDomain.mutateAsync({
                    appId: selectedAppId,
                    domainId: item.id,
                  });
                }}
                variant="danger"
              />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: {
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
