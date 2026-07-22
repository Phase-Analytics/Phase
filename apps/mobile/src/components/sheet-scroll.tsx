import type { ReactElement, ReactNode } from "react";
import {
  type RefreshControlProps,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  noOverscrollProps,
  refreshScrollProps,
} from "@/components/scroll-refresh";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * FormSheet content: RNScreens allows at most 2 subviews when a ScrollView is present —
 * ScrollView + optional footer with collapsable={false}. No KeyboardAvoidingView wrapper.
 */
export function SheetScroll({
  children,
  footer,
  refreshControl,
}: {
  children: ReactNode;
  footer?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        {...(refreshControl ? refreshScrollProps : noOverscrollProps)}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: footer
              ? Spacing.four
              : Math.max(insets.bottom, Spacing.four) + 24,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        refreshControl={refreshControl}
        showsVerticalScrollIndicator
        style={[styles.scroll, { backgroundColor: theme.background }]}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          collapsable={false}
          style={[
            styles.footer,
            {
              borderTopColor: theme.border,
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
});
