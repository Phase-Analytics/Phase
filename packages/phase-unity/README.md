# Phase Analytics — Unity SDK

Privacy-first mobile analytics for Unity (iOS/Android).

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](./LICENSE)

## Features

- **Privacy by Default** - No PII collected without explicit consent
- **Offline Support** - Everything is queued on disk and delivered in batches once online; nothing is dropped until the server acknowledges it
- **Events and Screens** - `Track` custom events and `TrackScreen` screen views
- **Lightweight** - IL2CPP-friendly, Newtonsoft.Json with link preservation
- **Self-Hostable** - Custom API base URL

## Installation

```
https://github.com/Phase-Analytics/Phase.git?path=packages/phase-unity#v0.2.0
```

**Or** `Packages/manifest.json`:

```json
{
  "dependencies": {
    "com.phase.analytics": "https://github.com/Phase-Analytics/Phase.git?path=packages/phase-unity#v0.2.0"
  }
}
```

**Requirements:** Unity 2021.3+, iOS 12+ / Android API 21+, `com.unity.nuget.newtonsoft-json`

## Quick Start

```csharp
await PhaseAnalytics.InitializeAsync(new PhaseConfig { ApiKey = "phase_xxx" });
await PhaseAnalytics.IdentifyAsync();
PhaseAnalytics.Track("app_opened");
PhaseAnalytics.Track("level_complete", new EventParams { ["level"] = 5 });
PhaseAnalytics.TrackScreen("Shop", new EventParams { ["tab"] = "coins" });
```

Calls made before `InitializeAsync`/`IdentifyAsync` finish are kept: events are stamped when you call `Track` and delivered once a session exists.

## Delivery

Data is sent in batches: when 20 items are queued, every 10 seconds while the queue is not empty, when the app goes to the background, and when connectivity returns. The queue is saved on disk, so unsent data survives restarts.

```csharp
// Send queued data now, e.g. before a scripted shutdown.
await PhaseAnalytics.FlushAsync();

// Forget this device, e.g. on logout: ends the session, tries to deliver queued data,
// clears the queue and creates a new device ID. Identify again to resume tracking.
await PhaseAnalytics.ResetAsync();
await PhaseAnalytics.IdentifyAsync();
```

Changing the API key clears data queued for the previous key.

## Releases

- **Unity:** git tag `unity-v{version}` from `packages/phase-unity/package.json` (workflow `unity-release.yml`)
- **Expo / React Native:** npm `phase-analytics@v{version}` from `packages/sdk` (workflow `release.yml`)

## Documentation

https://phase.sh/docs/get-started/unity

## Development

```bash
cd packages/phase-unity-dotnet
dotnet test Phase.Analytics.sln
node ../phase-unity-dotnet/scripts/verify-upm-package.js
```

## License

AGPL-3.0 — see [LICENSE](./LICENSE).
