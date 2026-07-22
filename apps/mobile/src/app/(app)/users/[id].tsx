import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  ErrorState,
  InfoRow,
  ListRow,
  LoadingState,
  MetaChips,
  RowIcon,
  Screen,
  SectionLabel,
} from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useSelectedApp } from "@/hooks/use-selected-app";
import { useTheme } from "@/hooks/use-theme";
import { useDevice } from "@/lib/api/queries/devices";
import { useSessions } from "@/lib/api/queries/sessions";
import {
  countryDisplayName,
  countryFlagEmoji,
  getDisplayName,
  platformLabel,
  platformSymbol,
  sessionRowSymbol,
} from "@/lib/display";
import { formatRelative, formatShortDate } from "@/lib/format";

export default function UserDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedAppId } = useSelectedApp();
  const device = useDevice(id ?? "", selectedAppId ?? "");
  const sessions = useSessions(selectedAppId ?? "", {
    deviceId: id,
    page: "1",
    pageSize: "10",
  });

  if (!selectedAppId || !id) {
    return (
      <Screen>
        <EmptyState title="Missing user" />
      </Screen>
    );
  }

  if (device.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (device.isError || !device.data) {
    return (
      <Screen>
        <ErrorState message={device.error?.message || "User not found"} />
      </Screen>
    );
  }

  const d = device.data;
  const name = getDisplayName(d.deviceId);
  const country = countryDisplayName(d.country);
  const flag = countryFlagEmoji(d.country);
  const properties = d.properties
    ? Object.entries(d.properties).slice(0, 20)
    : [];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.text }]}>
              {name.slice(0, 1)}
            </Text>
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
            <MetaChips country={country} flag={flag} platform={d.platform} />
          </View>
        </View>

        <View style={styles.card}>
          <InfoRow
            icon={platformSymbol(d.platform)}
            label="Platform"
            value={platformLabel(d.platform)}
          />
          <InfoRow icon="globe" label="Country" value={country ?? "—"} />
          <InfoRow icon="internaldrive" label="Model" value={d.model ?? "—"} />
          <InfoRow icon="iphone" label="OS" value={d.osVersion ?? "—"} />
          <InfoRow
            icon="calendar"
            label="First seen"
            value={formatShortDate(d.firstSeen)}
          />
          <InfoRow
            icon="clock"
            label="Last active"
            value={formatRelative(d.lastActivityAt)}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionPad}>
            <SectionLabel>Sessions</SectionLabel>
          </View>
          {(sessions.data?.sessions.length ?? 0) === 0 ? (
            <Text style={[styles.emptyInline, { color: theme.textSecondary }]}>
              {sessions.isLoading ? "Loading…" : "No sessions yet"}
            </Text>
          ) : (
            <View>
              {sessions.data?.sessions.map((item) => (
                <ListRow
                  key={item.sessionId}
                  leading={<RowIcon name={sessionRowSymbol()} />}
                  meta={formatRelative(item.lastActivityAt)}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/sessions/[id]",
                      params: {
                        id: item.sessionId,
                        deviceId: item.deviceId,
                        platform: item.platform ?? "",
                        country: item.country ?? "",
                        startedAt: item.startedAt,
                        lastActivityAt: item.lastActivityAt,
                      },
                    } as unknown as Href)
                  }
                  subtitle={
                    <MetaChips
                      country={countryDisplayName(item.country)}
                      flag={countryFlagEmoji(item.country)}
                      platform={item.platform}
                    />
                  }
                  title={formatShortDate(item.startedAt)}
                />
              ))}
            </View>
          )}
        </View>

        {properties.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionPad}>
              <SectionLabel>Properties</SectionLabel>
            </View>
            <View style={styles.props}>
              {properties.map(([key, value]) => (
                <View
                  key={key}
                  style={[styles.propRow, { borderBottomColor: theme.border }]}
                >
                  <Text style={[styles.propKey, { color: theme.textSecondary }]}>
                    {key}
                  </Text>
                  <Text style={[styles.propValue, { color: theme.text }]}>
                    {String(value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  card: {
    paddingHorizontal: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  sectionPad: {
    paddingHorizontal: Spacing.three,
  },
  emptyInline: {
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  props: {
    paddingHorizontal: Spacing.three,
  },
  propRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.two,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  propKey: { fontSize: 14, flex: 1 },
  propValue: { fontSize: 14, fontWeight: "500", flex: 1, textAlign: "right" },
});
