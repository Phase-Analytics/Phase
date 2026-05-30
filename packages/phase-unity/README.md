# Phase Analytics — Unity SDK

Privacy-first mobile analytics for Unity (iOS/Android).

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](./LICENSE)

## Features

- **Privacy by Default** - No PII collected without explicit consent
- **Offline Support** - Events queued locally and synced when online
- **Manual Event Tracking** - No automatic screen tracking; you control what is sent
- **Lightweight** - IL2CPP-friendly, Newtonsoft.Json with link preservation
- **Self-Hostable** - Custom API base URL

## Installation

Add the package via Unity Package Manager (Git URL):

1. **Window → Package Manager → + → Add package from git URL**
2. Enter:

```
https://github.com/Phase-Analytics/Phase.git?path=packages/phase-unity
```

Pin the latest release tag (recommended):

```
https://github.com/Phase-Analytics/Phase.git?path=packages/phase-unity#v0.1.2
```

- `v0.1.0` — committed `.meta` files for git UPM
- `v0.1.1` — `langVersion: 10` in asmdef (not enough on Unity 6 git UPM)
- `v0.1.2` — `Runtime/csc.rsp` with `-langversion:10` (CS8773 fix for Unity 6)

**Or** add to `Packages/manifest.json`:

```json
{
  "dependencies": {
    "com.phase.analytics": "https://github.com/Phase-Analytics/Phase.git?path=packages/phase-unity#v0.1.2"
  }
}
```

**Requirements**

- Unity 2021.3+
- iOS 12+ / Android API 21+
- `com.unity.nuget.newtonsoft-json` (declared in `package.json`)

## Quick Start

```csharp
using Phase.Analytics;
using Phase.Analytics.Config;
using Phase.Analytics.Models;

public class GameBootstrap : MonoBehaviour
{
    private async void Start()
    {
        var ok = await PhaseAnalytics.InitializeAsync(new PhaseConfig
        {
            ApiKey = "phase_xxx",
        });

        if (!ok) return;

        await PhaseAnalytics.IdentifyAsync();
        PhaseAnalytics.Track("app_opened");
    }
}
```

With `AutoBootstrap = true` (default), `InitializeAsync` creates a `PhaseLifecycleHook` for pause/resume and flush-on-quit.

See `Samples~/PhaseAnalyticsSample` for a minimal bootstrap script.

## Documentation

For complete documentation, including configuration, event rules, offline behavior, and IL2CPP notes:

- **[Unity Guide](https://phase.sh/docs/get-started/unity)** - Setup, API, and troubleshooting

## API Reference

### `PhaseAnalytics.InitializeAsync(config)`

Initializes storage, HTTP, managers, and optional lifecycle hook. Idempotent.

### `PhaseAnalytics.IdentifyAsync(properties?)`

Registers the device and starts a session. Required before `Track`.

```csharp
await PhaseAnalytics.IdentifyAsync();

await PhaseAnalytics.IdentifyAsync(new DeviceProperties
{
    ["user_id"] = "123",
    ["plan"] = "premium",
});
```

### `PhaseAnalytics.Track(eventName, params?)`

Track custom events (non-blocking). `isScreen` is always `false`.

```csharp
PhaseAnalytics.Track("level_complete", new EventParams
{
    ["level"] = 5,
    ["score"] = 1200,
});

// Manual scene / level tracking (not automatic)
PhaseAnalytics.Track("scene_loaded", new EventParams { ["scene"] = sceneName });
```

**Event params rules**

- Flat primitives only (`string`, `number`, `bool`, `null`)
- Max 32 keys, key max 32 chars
- String values max 256 chars
- Serialized payload max 8 KB

### `PhaseAnalytics.ClearLocalDataAsync()`

Wipes local Phase storage (GDPR-style). Does not delete server data. Re-init and identify after.

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `ApiKey` | `string` | **Required** | Starts with `phase_` |
| `BaseUrl` | `string` | `"https://api.phase.sh"` | Self-hosted API |
| `LogLevel` | enum | `None` | `Info`, `Warn`, `Error`, `None` |
| `DebugData` | `bool` | `false` | `x-phase-debug-data: 1` header |
| `DeviceInfo` | `bool` | `true` | OS, model, `app_version`, `engine`, `unity_version` |
| `UserLocale` | `bool` | `true` | Locale + server geolocation from IP |
| `AutoBootstrap` | `bool` | `true` | Auto `PhaseLifecycleHook` |
| `DisableInEditor` | `bool` | `false` | Skip network in Unity Editor |
| `AllowInsecureDev` | `bool` | `false` | Allow `http` base URL (dev only) |

**Unity-specific:** the SDK does not send a `platform` field (`ios`/`android`). The server treats it as unknown.

## Privacy

Phase Analytics is designed with privacy as a core principle:

- No personal data is collected by default
- Device IDs are generated locally and stored persistently
- Only technical metadata is collected when enabled (OS, model, app version, locale)
- Geolocation is resolved server-side from IP when `UserLocale` is enabled
- No IDFA or advertising identifiers in v1

**Important:** If you collect PII, ensure you have proper user consent.

## Distribution

This SDK ships inside the [Phase](https://github.com/Phase-Analytics/Phase) monorepo as a UPM package. There is no npm/OpenUPM publish.

**Releases:** tag the repo (e.g. `v0.1.0`) and pin the git URL to that tag. GitHub Releases on the main repo are used for changelog notes; Unity consumers install via UPM git URL, not a `.unitypackage` download.

## Development

```bash
cd packages/phase-unity-dotnet
dotnet test Phase.Analytics.sln
```

Regenerate Unity `.meta` files after changing `Runtime/` or `Samples~/`:

```bash
node packages/phase-unity-dotnet/scripts/generate-unity-metas.js
node packages/phase-unity-dotnet/scripts/verify-upm-package.js
```

## License

AGPL-3.0 — see [LICENSE](./LICENSE).

## Repository

- **Homepage**: [phase.sh](https://phase.sh)
- **GitHub**: [Phase-Analytics/Phase](https://github.com/Phase-Analytics/Phase)
- **Issues**: [Report a bug](https://github.com/Phase-Analytics/Phase/issues)
