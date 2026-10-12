# Phase Analytics SDK

Privacy-first mobile analytics for React Native and Expo applications.

[![npm version](https://img.shields.io/npm/v/phase-analytics.svg)](https://www.npmjs.com/package/phase-analytics)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](./LICENSE)

## Features

- **Privacy by Default** - No PII collected without explicit consent
- **Offline Support** - Events are queued on the device and delivered in batches once online
- **Screen Tracking** - Automatic with Expo Router or React Navigation, or manual
- **TypeScript Native** - Full type safety out of the box
- **Lightweight** - Minimal bundle size impact
- **Self-Hostable** - Run on your own infrastructure

## Installation

### For Expo Projects

```bash
# Install the SDK
bun add phase-analytics

# Install peer dependencies
bunx expo install @react-native-async-storage/async-storage expo-application expo-device expo-localization

# Optional: offline detection, and automatic screen tracking with Expo Router
bunx expo install @react-native-community/netinfo expo-router
```

### For React Native Projects

```bash
# Install the SDK
bun add phase-analytics

# Install peer dependencies
bun add @react-native-async-storage/async-storage react-native-device-info react-native-localize

# Optional: offline detection
bun add @react-native-community/netinfo

# iOS only: Install CocoaPods dependencies
cd ios && pod install
```

## Quick Start

### Expo

```tsx
// app/_layout.tsx
import { PhaseProvider } from 'phase-analytics/expo';

export default function RootLayout() {
  return (
    <PhaseProvider apiKey="phase_xxx">
      <Stack />
    </PhaseProvider>
  );
}

// app/index.tsx
import { Phase } from 'phase-analytics/expo';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Register the device and start a session - no PII collected by default
    Phase.identify();
    Phase.track('app_opened');
  }, []);

  return <YourApp />;
}
```

### React Native

```tsx
// App.tsx
import { PhaseProvider } from 'phase-analytics/react-native';
import { NavigationContainer } from '@react-navigation/native';

export default function App() {
  return (
    <NavigationContainer>
      <PhaseProvider apiKey="phase_xxx">
        <YourApp />
      </PhaseProvider>
    </NavigationContainer>
  );
}

// Inside your component
import { Phase } from 'phase-analytics/react-native';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Register the device and start a session - no PII collected by default
    Phase.identify();
    Phase.track('app_opened');
  }, []);

  return <YourApp />;
}
```

## Documentation

For complete documentation, including:
- Configuration options
- Event tracking best practices
- Automatic screen tracking setup
- Type references
- Privacy guidelines

Visit our documentation:

- **[Expo Guide](https://phase.sh/docs/get-started/expo)** - Complete setup guide for Expo projects
- **[React Native Guide](https://phase.sh/docs/get-started/react-native)** - Complete setup guide for React Native projects
- **[Unity Guide](https://phase.sh/docs/get-started/unity)** - Setup guide for Unity (iOS/Android)

## API Reference

### `Phase.identify(properties?)`

Register the device and start a session. Events tracked before the first `identify()` are buffered in memory (up to 200, oldest dropped first) and sent once it runs. Calls made before `PhaseProvider` mounts, e.g. from child effects, are queued and run after initialization.

```tsx
// Basic usage - no PII collected
await Phase.identify();

// With custom properties
await Phase.identify({
  user_id: '123',
  plan: 'premium',
  beta_tester: true
});
```

### `Phase.track(eventName, params?)`

Track custom events with optional parameters.

Rules for `params`:
- flat primitive object only
- max 32 keys
- key max 32 chars
- string value max 256 chars
- serialized payload max 8 KB
- empty objects are normalized away

```tsx
// Event without parameters
Phase.track('app_opened');

// Event with parameters
Phase.track('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  product_id: 'premium_plan'
});
```

### `Phase.trackScreen(name, params?)`

Track a screen view manually, e.g. when `trackNavigation` is off or you use a custom navigator. `params` follow the same rules as `track()`.

```tsx
Phase.trackScreen('/settings/profile');
```

### `Phase.flush()`

Send queued data now. Resolves when the attempt finishes. Data is also sent automatically (see [Delivery](#delivery)), so this is rarely needed.

### `Phase.reset()`

Forget the current device, e.g. on logout. Ends the session and generates a new device ID; data already queued for the previous device is still delivered. Call `identify()` again to start tracking.

```tsx
await Phase.reset();
await Phase.identify();
```

## Screen Tracking

Screen tracking is off by default. Set `trackNavigation` to enable it:

- **Expo**: requires `expo-router`. Screens are tracked by pathname.
- **React Native**: pass your `NavigationContainer` ref as `navigationRef`. Screens are tracked by route path when the focused route changes.

```tsx
const navigationRef = useNavigationContainerRef();

<NavigationContainer ref={navigationRef}>
  <PhaseProvider apiKey="phase_xxx" trackNavigation navigationRef={navigationRef}>
    <YourApp />
  </PhaseProvider>
</NavigationContainer>
```

## Delivery

Events, sessions and heartbeats go through a persistent queue and are sent to the batch endpoint:

- every ~10 seconds while data is queued, as soon as 20 items are queued, and when the app goes to the background
- items leave the queue only after the server accepts them; failed requests are retried with backoff (honoring `Retry-After`)
- the queue survives app restarts (stored in AsyncStorage, capped at ~1.5 MB; the oldest sessions are dropped first when full)
- while offline (with `@react-native-community/netinfo` installed) nothing is sent, and only the latest heartbeat per session is kept
- changing the API key clears data queued under the previous key

## Configuration

Both `PhaseProvider` components accept the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | `string` | **Required** | Your Phase API key (starts with `phase_`) |
| `trackNavigation` | `boolean` | `false` | Automatically track screen views (see [Screen Tracking](#screen-tracking)) |
| `navigationRef` | `NavigationContainerRef` | - | React Native only. Required for `trackNavigation` |
| `debugData` | `boolean` | `false` | Mark identify/events as debug data |
| `baseUrl` | `string` | `"https://api.phase.sh"` | Custom API endpoint for self-hosted deployments |
| `logLevel` | `"info" \| "warn" \| "error" \| "none"` | `"none"` | Console logging level for debugging |
| `deviceInfo` | `boolean` | `true` | Collect device metadata (model, OS version, platform, app version as `app_version`) |
| `userLocale` | `boolean` | `true` | Collect user locale and timezone information |

## Privacy

Phase Analytics is designed with privacy as a core principle:

- No personal data is collected by default
- Device IDs are generated locally and stored persistently
- Only technical metadata is collected (OS version, platform, locale)
- Geolocation is resolved server-side from IP address
- All data collection is optional via configuration

**Important:** If you collect PII (personally identifiable information), ensure you have proper user consent.

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](./LICENSE) file for details.

## Repository

- **Homepage**: [phase.sh](https://phase.sh)
- **GitHub**: [Phase-Analytics/Phase](https://github.com/Phase-Analytics/Phase)
- **Issues**: [Report a bug](https://github.com/Phase-Analytics/Phase/issues)
