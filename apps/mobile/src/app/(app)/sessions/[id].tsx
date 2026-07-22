import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { SheetScroll } from "@/components/sheet-scroll";
import {
  EmptyState,
  ErrorState,
  InfoRow,
  ListRow,
  LoadingState,
  MetaChips,
  RowIcon,
  SectionLabel,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import { useEvents } from "@/lib/api/queries/events";
import {
  countryDisplayName,
  countryFlagEmoji,
  eventRowSymbol,
  getDisplayName,
  platformLabel,
  platformSymbol,
} from "@/lib/display";
import { formatRelative, formatShortDate } from "@/lib/format";

export default function SessionDetailSheet() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    deviceId?: string;
    platform?: string;
    country?: string;
    startedAt?: string;
    lastActivityAt?: string;
  }>();
  const { selectedAppId } = useSelectedApp();
  const events = useEvents(selectedAppId ?? "", {
    sessionId: params.id,
    page: "1",
    pageSize: "50",
  });

  if (!(selectedAppId && params.id)) {
    return <EmptyState compact title="Missing session" />;
  }

  const country = countryDisplayName(params.country);
  const flag = countryFlagEmoji(params.country);
  const userName = getDisplayName(params.deviceId);

  return (
    <SheetScroll>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: theme.text }]}>{userName}</Text>
        <MetaChips
          country={country}
          flag={flag}
          platform={params.platform}
        />
      </View>

      <View>
        <InfoRow
          icon={platformSymbol(params.platform)}
          label="Platform"
          value={platformLabel(params.platform)}
        />
        <InfoRow
          icon="globe"
          label="Country"
          value={country ?? "—"}
        />
        <InfoRow
          icon="calendar"
          label="Started"
          value={formatShortDate(params.startedAt)}
        />
        <InfoRow
          icon="clock"
          label="Last active"
          value={formatRelative(params.lastActivityAt)}
        />
      </View>

      {params.deviceId ? (
        <Text
          onPress={() => router.push(`/(app)/users/${params.deviceId}`)}
          style={[styles.userLink, { color: theme.text }]}
        >
          View user
        </Text>
      ) : null}

      <SectionLabel>Events</SectionLabel>
      {events.isLoading ? (
        <LoadingState />
      ) : events.isError ? (
        <ErrorState compact message={events.error.message} />
      ) : (events.data?.events.length ?? 0) === 0 ? (
        <EmptyState compact title="No events in this session" />
      ) : (
        <View style={styles.events}>
          {events.data?.events.map((item) => (
            <ListRow
              key={item.eventId}
              leading={<RowIcon name={eventRowSymbol(item.isScreen)} />}
              meta={formatRelative(item.timestamp)}
              title={item.isScreen ? `View ${item.name}` : item.name}
            />
          ))}
        </View>
      )}
    </SheetScroll>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 8,
    paddingBottom: Spacing.one,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  userLink: {
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 4,
  },
  events: {
    marginHorizontal: -Spacing.three,
  },
});
