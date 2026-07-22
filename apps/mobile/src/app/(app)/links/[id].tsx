import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  CursorIcon,
  LinkBrowserGlyph,
  LinkOsIcon,
  LinkReferrerIcon,
  mergeBrowserBreakdown,
  mergeOsBreakdown,
  mergeReferrerBreakdown,
} from "@/components/brand-icons";
import { ChartBlock } from "@/components/chart-block";
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  PaginationBar,
  RankList,
  Screen,
  SectionLabel,
  StatCard,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import {
  useLink,
  useLinkAnalytics,
  useLinkClicks,
} from "@/lib/api/queries/links";
import {
  countryDisplayName,
  countryFlagEmoji,
} from "@/lib/display";
import { formatNumber, formatRelative, PAGE_SIZE } from "@/lib/format";

export default function LinkDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedAppId } = useSelectedApp();
  const [clicksPage, setClicksPage] = useState(1);
  const link = useLink(selectedAppId ?? "", id ?? "");
  const analytics = useLinkAnalytics(selectedAppId ?? "", id ?? "");
  const clicks = useLinkClicks(selectedAppId ?? "", id ?? "", {
    page: String(clicksPage),
    pageSize: String(PAGE_SIZE),
  });

  if (!selectedAppId || !id) {
    return (
      <Screen>
        <EmptyState title="Missing link" />
      </Screen>
    );
  }

  if (link.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (link.isError || !link.data) {
    return (
      <Screen>
        <ErrorState message={link.error?.message || "Link not found"} />
      </Screen>
    );
  }

  const data = link.data;
  const chartData =
    analytics.data?.timeseries.map((point) => ({
      date: point.date,
      value: point.clicks,
    })) ?? [];

  const countries =
    analytics.data?.countries.slice(0, 6).map((item) => ({
      label: countryDisplayName(item.key) ?? item.key,
      count: item.count,
      leading: (
        <Text style={styles.flag}>
          {countryFlagEmoji(item.key) ?? "🌐"}
        </Text>
      ),
    })) ?? [];

  const operatingSystems = mergeOsBreakdown(
    analytics.data?.operatingSystems ?? []
  ).map((item) => ({
    label: item.label,
    count: item.count,
    leading: <LinkOsIcon os={item.key} />,
  }));

  const browsers = mergeBrowserBreakdown(analytics.data?.browsers ?? []).map(
    (item) => ({
      label: item.label,
      count: item.count,
      leading: <LinkBrowserGlyph browser={item.key} />,
    })
  );

  const referrers = mergeReferrerBreakdown(
    analytics.data?.referrers ?? []
  ).map((item) => ({
    label: item.label,
    count: item.count,
    leading: <LinkReferrerIcon />,
  }));

  const clicksTotalPages = clicks.data?.pagination.totalPages ?? 1;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <Text style={[styles.title, { color: theme.text }]}>
            {data.name || data.slug}
          </Text>
          <Text style={[styles.slug, { color: theme.textSecondary }]} selectable>
            {data.shortUrl}
          </Text>
          <Text style={[styles.url, { color: theme.text }]} selectable>
            {data.destinationUrl}
          </Text>
          {data.disabledAt ? (
            <Text style={[styles.badge, { color: theme.danger }]}>Disabled</Text>
          ) : null}
        </View>

        <View style={styles.stats}>
          <StatCard
            label="Clicks"
            value={formatNumber(
              analytics.data?.totalClicks ?? data.totalClicks ?? 0
            )}
          />
          <StatCard
            label="Unique"
            value={formatNumber(analytics.data?.uniqueVisits ?? 0)}
          />
        </View>

        {analytics.isLoading ? (
          <LoadingState />
        ) : (
          <>
            <View style={styles.chartPad}>
              <ChartBlock data={chartData} height={220} />
            </View>
            <View style={styles.distributions}>
              <RankList items={countries} title="Countries" />
              <RankList items={operatingSystems} title="Operating systems" />
              <RankList items={browsers} title="Browsers" />
              <RankList items={referrers} title="Referrers" />
            </View>
          </>
        )}

        <View style={styles.clicks}>
          <View style={styles.chartPad}>
            <SectionLabel>Recent clicks</SectionLabel>
          </View>
          {clicks.isLoading ? (
            <LoadingState />
          ) : clicks.isError ? (
            <ErrorState compact message={clicks.error.message} />
          ) : (clicks.data?.clicks.length ?? 0) === 0 ? (
            <EmptyState compact title="No clicks yet" />
          ) : (
            <View>
              {clicks.data?.clicks.map((item) => (
                <ListRow
                  key={item.clickId}
                  leading={<CursorIcon />}
                  meta={formatRelative(item.timestamp)}
                  subtitle={[item.os, item.browser, item.referrer || "Direct"]
                    .filter(Boolean)
                    .join(" · ")}
                  title={
                    countryDisplayName(item.countryCode) ??
                    item.countryCode ??
                    "Unknown"
                  }
                />
              ))}
              <PaginationBar
                onNext={() =>
                  setClicksPage((current) =>
                    Math.min(clicksTotalPages, current + 1)
                  )
                }
                onPrev={() =>
                  setClicksPage((current) => Math.max(1, current - 1))
                }
                page={clicksPage}
                totalPages={clicksTotalPages}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  hero: {
    paddingHorizontal: Spacing.three,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  slug: { fontSize: 14 },
  url: { fontSize: 15 },
  badge: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  stats: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  chartPad: {
    paddingHorizontal: Spacing.three,
  },
  distributions: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  clicks: {
    gap: Spacing.two,
  },
  flag: {
    fontSize: 13,
  },
});
