# Phase Analytics SDK

Privacy-first mobile analytics for React Native and Expo applications.

[![npm version](https://img.shields.io/npm/v/phase-analytics.svg)](https://www.npmjs.com/package/phase-analytics)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](./LICENSE)

## Features

- **Privacy by Default** - No PII collected without explicit consent
- **Offline Support** - Events queued locally and synced when online
- **Automatic Screen Tracking** - Track navigation with zero configuration
- **TypeScript Native** - Full type safety out of the box
- **Lightweight** - Minimal bundle size impact
- **Self-Hostable** - Run on your own infrastructure

## Installation

### For Expo Projects

```bash
# Install the SDK
bun add phase-analytics

# Install required peer dependencies
bunx expo install @react-native-async-storage/async-storage @react-native-community/netinfo expo-application expo-device expo-localization expo-router
```

### For React Native Projects

```bash
# Install the SDK
bun add phase-analytics

# Install required peer dependencies
bun add @react-native-async-storage/async-storage @react-native-community/netinfo react-native-device-info react-native-localize @react-navigation/native

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
    // Initialize analytics - no PII collected by default
    Phase.identify();
  }, []);

  // Track custom events
  Phase.track('app_opened');

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
    // Initialize analytics - no PII collected by default
    Phase.identify();
  }, []);

  // Track custom events
  Phase.track('app_opened');

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

## API Reference

### `Phase.identify(properties?)`

Register the device and start a session. Must be called before tracking events.

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

## Configuration

Both `PhaseProvider` components accept the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | `string` | **Required** | Your Phase API key (starts with `phase_`) |
| `trackNavigation` | `boolean` | `false` | Automatically track screen views |
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
