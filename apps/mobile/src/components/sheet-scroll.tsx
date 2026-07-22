import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * FormSheet content: RNScreens allows at most 2 subviews when a ScrollView is present —
 * ScrollView + optional footer with collapsable={false}. No KeyboardAvoidingView wrapper.
 */
export function SheetScroll({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: footer
              ? Spacing.four
              : Math.max(insets.bottom, Spacing.four) + 24,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
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
    gap: Spacing.three,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
});
