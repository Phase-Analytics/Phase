# Changelog

## 0.1.12

- Remove `city` from `DeviceResponse` (geolocation is country-only).

## 0.1.11

- Allow continuously active sessions to run for up to two hours.

## 0.1.10

- Rotate sessions after one hour even while the app remains continuously active.
- Prevent stale sessions from producing inflated durations after delayed lifecycle transitions.

## 0.1.9

- Default HTTP transport on Unity is `System.Net.Http` (`SystemNetHttpTransport`), safe when SDK continuations use `ConfigureAwait(false)`.
- Opt-in `PhaseConfig.UseUnityWebRequestTransport`: `UnityWebRequest` runs on the main thread via `MainThreadDispatcher` (per-frame poll, no thread-pool `SendWebRequest`).

## 0.1.8

- `UnityNetworkMonitor`: only `PollIfDue` (main thread) calls `Application.internetReachability`. `Subscribe` and `FetchNetworkStateAsync` return cached `_lastState`.

## 0.1.7

- Create `PhaseLifecycleHook` on the Unity main thread before any `await` in `InitializeAsync` (fixes `Internal_CreateGameObject` when init continues on a thread-pool thread).
- Cache device info on the main thread during init so `IdentifyAsync` does not read `Application` / `SystemInfo` off-thread.
- Poll network reachability from `PhaseLifecycleHook.Update` instead of a `Timer` callback.

## 0.1.6

- `platform` (`ios` / `android`) and BCP47 locale on identify.
- Events-only API (`Track`).
