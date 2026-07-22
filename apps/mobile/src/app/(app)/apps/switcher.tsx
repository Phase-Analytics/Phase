import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  QueryRefreshControl,
  useQueryRefresh,
} from "@/components/scroll-refresh";
import { SheetScroll } from "@/components/sheet-scroll";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import { track } from "@/lib/analytics";
import { signOut, useSession } from "@/lib/auth-client";

function openDeleteAccountEmail(email: string, userId?: string) {
  const subject = encodeURIComponent("Phase account deletion request");
  const body = encodeURIComponent(
    [
      "Please delete my Phase account and associated data.",
      "",
      `Email: ${email || "(unknown)"}`,
      `User ID: ${userId || "(unknown)"}`,
      "",
      "Requested from the Phase iOS/Android app.",
    ].join("\n")
  );
  void Linking.openURL(
    `mailto:support@phase.sh?subject=${subject}&body=${body}`
  );
}

function formatRole(role: string): string {
  if (!role) {
    return "";
  }
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export default function AppSwitcherSheet() {
  const theme = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const {
    apps,
    selectedAppId,
    setSelectedAppId,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useSelectedApp();

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const { refreshing, onRefresh } = useQueryRefresh({
    isRefetching,
    refetch,
  });

  const userName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Account";
  const userEmail = session?.user?.email ?? "";

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  return (
    <SheetScroll
      refreshControl={
        <QueryRefreshControl onRefresh={onRefresh} refreshing={refreshing} />
      }
    >
      <View
        style={[
          styles.account,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}
        >
          <Text style={[styles.avatarText, { color: theme.text }]}>
            {userName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.accountText}>
          <Text style={[styles.accountName, { color: theme.text }]}>
            {userName}
          </Text>
          {userEmail ? (
            <Text
              style={[styles.accountEmail, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {userEmail}
            </Text>
          ) : null}
        </View>
      </View>

      {apps.length === 0 ? (
        <EmptyState
          compact
          subtitle="Create an app on the web, then select it here."
          title="No apps yet"
        />
      ) : (
        <View style={styles.list}>
          {apps.map((item) => {
            const selected = item.id === selectedAppId;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedAppId(item.id);
                  void track("app_selected", {
                    app_id: item.id,
                    app_name: item.name,
                  });
                  router.back();
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed
                      ? theme.backgroundSelected
                      : selected
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                    borderColor: selected ? theme.text : theme.border,
                  },
                ]}
              >
                <View style={styles.rowMain}>
                  <Text style={[styles.name, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.role, { color: theme.textSecondary }]}>
                    {formatRole(item.role)}
                  </Text>
                </View>
                {selected ? (
                  <Text style={[styles.check, { color: theme.text }]}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label="Delete account"
          onPress={() => {
            void track("mobile_delete_account_request");
            openDeleteAccountEmail(userEmail, session?.user?.id);
          }}
          variant="secondary"
        />
        <PrimaryButton
          label="Sign out"
          onPress={() => {
            void track("mobile_sign_out");
            void signOut();
          }}
          variant="danger"
        />
      </View>
    </SheetScroll>
  );
}

const styles = StyleSheet.create({
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  accountText: {
    flex: 1,
    gap: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "600",
  },
  accountEmail: {
    fontSize: 12,
  },
  footer: {
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
  },
  list: {
    gap: Spacing.one + 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    flex: 1,
    gap: 1,
  },
  name: { fontSize: 15, fontWeight: "600" },
  role: { fontSize: 12 },
  check: { fontSize: 15, fontWeight: "700" },
});
