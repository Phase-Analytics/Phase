# Phase Analytics SDK

Analytics SDK for React Native and Expo applications.

## Installation

```bash
npm install @phase/sdk
# or
bun add @phase/sdk
```

## React Native

### Setup

Wrap your app with `PhaseProvider` and enable navigation tracking:

```tsx
import { PhaseProvider } from '@phase/sdk/react-native';
import { NavigationContainer } from '@react-navigation/native';

function App() {
  return (
    <PhaseProvider apiKey="phase_xxx" trackNavigation>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </PhaseProvider>
  );
}
```

### Usage

```tsx
import { Phase } from '@phase/sdk/react-native';

// Identify user (call after login or on app start)
await Phase.identify({ user_id: '123', plan: 'premium' });

// Track events
await Phase.track('purchase', { amount: 99.99, currency: 'USD' });
```

### Options

```tsx
<PhaseProvider
  apiKey="phase_xxx"           // Required: Your Phase API key
  trackNavigation              // Optional: Auto-track screen navigation
  baseUrl="https://api.phase.sh" // Optional: Custom API endpoint
  logLevel="info"              // Optional: 'info' | 'warn' | 'error' | 'none'
  deviceInfo={true}            // Optional: Collect device metadata
  userLocale={true}            // Optional: Collect locale & geolocation
>
  {children}
</PhaseProvider>
```

## Expo

### Setup

Wrap your app with `PhaseProvider`:

```tsx
import { PhaseProvider } from '@phase/sdk/expo';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <PhaseProvider apiKey="phase_xxx" trackNavigation>
      <Stack>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
      </Stack>
    </PhaseProvider>
  );
}
```

### Usage

```tsx
import { Phase } from '@phase/sdk/expo';

// Identify user
await Phase.identify({ user_id: '123', plan: 'premium' });

// Track events
await Phase.track('purchase', { amount: 99.99, currency: 'USD' });
```

### Options

```tsx
<PhaseProvider
  apiKey="phase_xxx"           // Required: Your Phase API key
  trackNavigation              // Optional: Auto-track screen navigation
  baseUrl="https://api.phase.sh" // Optional: Custom API endpoint
  logLevel="info"              // Optional: 'info' | 'warn' | 'error' | 'none'
  deviceInfo={true}            // Optional: Collect device metadata
  userLocale={true}            // Optional: Collect locale & geolocation
>
  {children}
</PhaseProvider>
```

## API

### `Phase.identify(properties?)`

Register device and start session. Call this after user login or on app start.

```tsx
await Phase.identify();
await Phase.identify({ user_id: '123', plan: 'premium' });
```

### `Phase.track(name, params?)`

Track custom events.

```tsx
await Phase.track('purchase', { amount: 99.99, currency: 'USD' });
await Phase.track('button_click', { button_id: 'checkout' });
```

## Notes

- SDK automatically queues calls if not initialized yet
- Navigation tracking is automatic when `trackNavigation` is enabled
- All tracking calls are async and safe to call immediately
