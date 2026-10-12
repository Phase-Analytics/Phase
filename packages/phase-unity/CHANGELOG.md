# Changelog

## Unreleased

- Deliver devices, sessions, events and heartbeats through one persistent queue sent via `POST /sdk/batch`: flushes at 20 items, every 10 s while non-empty, on background and on network restore.
- Items leave the queue only after the server acknowledges them or rejects them as non-retryable; retryable failures are kept for up to 5 attempts. An interrupted or failed flush no longer loses data.
- Each event gets a ULID `eventId` at `Track()` time, stable across retries so the server can deduplicate.
- Events tracked before identify keep their original timestamp and id, are buffered (up to 200, max one hour) and replayed without rate limiting or dedup.
- Queued heartbeats replace the previous one for the same session.
- Queue writes are debounced (1 s, plus on pause/quit), streamed to disk and capped at 1 MB / 1000 items.
- Fix persisted timestamps being reloaded as culture-formatted strings, which made the server reject queued items after an app restart.
- One deadline per flush, no overlapping flushes, 10 s request timeout, full-jitter retries and `Retry-After` support for 429. Non-retryable 4xx responses are dropped instead of re-queued.
- App quit only saves the queue; it no longer blocks the main thread on a network flush (which could deadlock with `UseUnityWebRequestTransport`).
- Thread-safe queue, session and lifecycle handling; repeated pause/focus callbacks are no-ops.
- Generate spec-compliant ULIDs (Unix epoch) for device, session and event IDs; stored device IDs that are not ULIDs are replaced.
- `osVersion` is now the numeric version (`17.2`, `14`) and `locale` a BCP 47 tag, falling back to the system language code.
- New APIs: `PhaseAnalytics.TrackScreen`, `PhaseAnalytics.FlushAsync`, `PhaseAnalytics.ResetAsync`.
- Enable nullable annotations for the Unity compiler (`csc.rsp`).

## 0.1.13

- Use adaptive session heartbeats and reset the heartbeat after successful event or ping activity.
- Process lifecycle work without an idle per-frame update loop.

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
