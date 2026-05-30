# Changelog

## 0.1.8

- `UnityNetworkMonitor`: only `PollIfDue` (main thread) calls `Application.internetReachability`. `Subscribe` and `FetchNetworkStateAsync` return cached `_lastState`.

## 0.1.7

- Create `PhaseLifecycleHook` on the Unity main thread before any `await` in `InitializeAsync` (fixes `Internal_CreateGameObject` when init continues on a thread-pool thread).
- Cache device info on the main thread during init so `IdentifyAsync` does not read `Application` / `SystemInfo` off-thread.
- Poll network reachability from `PhaseLifecycleHook.Update` instead of a `Timer` callback.

## 0.1.6

- `platform` (`ios` / `android`) and BCP47 locale on identify.
- Events-only API (`Track`).
