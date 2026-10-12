using System;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Managers;

/// <summary>
/// Owns the current session. State is shared between the main thread (lifecycle) and the ping
/// timer, so every transition happens under one lock and rotation is atomic.
/// </summary>
public sealed class SessionManager : IDisposable
{
    private readonly OfflineQueue _offlineQueue;
    private readonly ISessionPingScheduler _pingScheduler;
    private readonly Func<string?> _getDeviceId;
    private readonly object _sync = new();
    private string? _sessionId;
    private DateTime? _startedAt;
    private long? _pausedAtMs;
    private bool _isPaused;

    public SessionManager(
        OfflineQueue offlineQueue,
        Func<string?> getDeviceId,
        ISessionPingScheduler? pingScheduler = null
    )
    {
        _offlineQueue = offlineQueue;
        _getDeviceId = getDeviceId;
        _pingScheduler = pingScheduler ?? new TimerSessionPingScheduler();
    }

    /// <summary>
    /// Starts a session unless one is already active and returns the active session id.
    /// <paramref name="startedAtUtc"/> backdates a new session so events tracked before identify
    /// fall inside it (the server rejects events older than their session).
    /// </summary>
    public string? Start(DateTime? startedAtUtc = null)
    {
        lock (_sync)
        {
            if (_sessionId != null)
            {
                return _sessionId;
            }

            var now = DateTime.UtcNow;
            return StartNewSessionLocked(
                startedAtUtc.HasValue && startedAtUtc.Value < now ? startedAtUtc.Value : now
            );
        }
    }

    /// <summary>Idempotent: repeated calls (pause + focus loss) keep the first pause time.</summary>
    public void Pause()
    {
        lock (_sync)
        {
            if (_isPaused)
            {
                return;
            }

            _isPaused = true;
            _pausedAtMs = NowMs();
            _pingScheduler.Stop();
        }
    }

    /// <summary>
    /// Rotates the session if it is too old or was inactive too long, otherwise resumes pings.
    /// Idempotent: a second call without an intervening pause does nothing.
    /// </summary>
    public void Resume()
    {
        lock (_sync)
        {
            var wasPaused = _isPaused;
            var pausedAtMs = _pausedAtMs;
            _isPaused = false;
            _pausedAtMs = null;

            if (_sessionId == null)
            {
                return;
            }

            var now = NowMs();
            if (_startedAt.HasValue && now - ToUnixMs(_startedAt.Value) > ValidationConstants.MaxSessionAgeMs)
            {
                Logger.Info("Session too old, starting new session");
                StartNewSessionLocked(DateTime.UtcNow);
                return;
            }

            if (pausedAtMs.HasValue && now - pausedAtMs.Value > ValidationConstants.InactivityTimeoutMs)
            {
                Logger.Info("Session inactive for too long, starting new session");
                StartNewSessionLocked(DateTime.UtcNow);
                return;
            }

            if (wasPaused)
            {
                StartPingIntervalLocked();
            }
        }
    }

    public void MarkActivity()
    {
        _pingScheduler.NotifyActivity();
    }

    public string? GetSessionId()
    {
        lock (_sync)
        {
            return _sessionId;
        }
    }

    /// <summary>Ends the current session without starting a new one (used by reset).</summary>
    public void End()
    {
        lock (_sync)
        {
            _pingScheduler.Stop();
            _sessionId = null;
            _startedAt = null;
            _pausedAtMs = null;
        }
    }

    public void Dispose()
    {
        _pingScheduler.Stop();
        if (_pingScheduler is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }

    private string? StartNewSessionLocked(DateTime startedAt)
    {
        _pingScheduler.Stop();

        var deviceId = _getDeviceId();
        if (string.IsNullOrEmpty(deviceId))
        {
            Logger.Error("Device ID not set. Cannot start session.");
            _sessionId = null;
            _startedAt = null;
            return null;
        }

        var sessionId = IdGenerator.GenerateSessionId();
        _sessionId = sessionId;
        _startedAt = startedAt;
        _pausedAtMs = null;

        _offlineQueue.Enqueue(
            new BatchSessionItem
            {
                Payload = new CreateSessionRequest
                {
                    SessionId = sessionId,
                    DeviceId = deviceId!,
                    StartedAt = startedAt.ToString("o"),
                },
            }
        );

        if (!_isPaused)
        {
            StartPingIntervalLocked();
        }

        return sessionId;
    }

    private void StartPingIntervalLocked()
    {
        var sessionStartedAt = _startedAt.HasValue
            ? new DateTimeOffset(_startedAt.Value)
            : DateTimeOffset.UtcNow;

        _pingScheduler.Start(SendPingAsync, sessionStartedAt);
    }

    private Task SendPingAsync()
    {
        lock (_sync)
        {
            if (_sessionId == null || _isPaused)
            {
                return Task.CompletedTask;
            }

            var now = DateTime.UtcNow;
            if (
                _startedAt.HasValue
                && ToUnixMs(now) - ToUnixMs(_startedAt.Value) >= ValidationConstants.MaxSessionAgeMs
            )
            {
                Logger.Info("Session reached maximum age, starting new session");
                StartNewSessionLocked(DateTime.UtcNow);
                return Task.CompletedTask;
            }

            _offlineQueue.Enqueue(
                new BatchPingItem
                {
                    Payload = new PingSessionRequest
                    {
                        SessionId = _sessionId,
                        Timestamp = now.ToString("o"),
                    },
                }
            );
        }

        return Task.CompletedTask;
    }

    private static long ToUnixMs(DateTime utc) => new DateTimeOffset(utc).ToUnixTimeMilliseconds();

    private static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}
