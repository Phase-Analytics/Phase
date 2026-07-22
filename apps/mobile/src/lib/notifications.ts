import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
});

export async function ensureLocalNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();

  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return current;
  }

  return Notifications.requestPermissionsAsync();
}

export async function scheduleLocalNotification(input: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  seconds?: number;
}) {
  const permission = await ensureLocalNotificationPermission();

  if (
    !(
      permission.granted ||
      permission.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL
    )
  ) {
    throw new Error("local notification permission denied");
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data,
    },
    trigger:
      input.seconds === undefined
        ? null
        : {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: input.seconds,
          },
  });
}

export async function cancelAllLocalNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
