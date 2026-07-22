import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SheetScroll } from "@/components/sheet-scroll";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";

export default function AppSwitcherSheet() {
  const theme = useTheme();
  const router = useRouter();
  const {
    apps,
    selectedAppId,
    setSelectedAppId,
    isLoading,
    error,
    refetch,
  } = useSelectedApp();

  useEffect(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  return (
    <SheetScroll>
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
                    {item.role}
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
    </SheetScroll>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  name: { fontSize: 17, fontWeight: "600" },
  role: { fontSize: 13 },
  check: { fontSize: 16, fontWeight: "700" },
});
