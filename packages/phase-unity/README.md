# Phase Analytics — Unity SDK

Privacy-first mobile analytics for Unity (iOS/Android).

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](./LICENSE)

## Features

- **Privacy by Default** - No PII collected without explicit consent
- **Offline Support** - Events queued locally and synced when online
- **Event Tracking Only** - `Track` custom events (no screen tracking API)
- **Lightweight** - IL2CPP-friendly, Newtonsoft.Json with link preservation
- **Self-Hostable** - Custom API base URL

## Installation

```
https://github.com/Phase-Analytics/Phase.git?path=packages/phase-unity#v0.1.13
```

**Or** `Packages/manifest.json`:

```json
{
  "dependencies": {
    "com.phase.analytics": "https://github.com/Phase-Analytics/Phase.git?path=packages/phase-unity#v0.1.13"
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
```

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
