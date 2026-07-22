import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabsLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="users">
        <NativeTabs.Trigger.Icon
          md="group"
          sf={{ default: "person.2", selected: "person.2.fill" }}
        />
        <NativeTabs.Trigger.Label>Users</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sessions">
        <NativeTabs.Trigger.Icon
          md="play_circle"
          sf={{ default: "play.square", selected: "play.square.fill" }}
        />
        <NativeTabs.Trigger.Label>Sessions</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Icon
          md="bolt"
          sf={{ default: "bolt", selected: "bolt.fill" }}
        />
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="links">
        <NativeTabs.Trigger.Icon
          md="link"
          sf={{ default: "link", selected: "link" }}
        />
        <NativeTabs.Trigger.Label>Links</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
