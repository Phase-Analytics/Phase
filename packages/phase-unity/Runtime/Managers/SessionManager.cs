using System;
using System.Threading.Tasks;
using Phase.Analytics.Client;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Managers;

public sealed class SessionManager : IDisposable
{
    private readonly SdkHttpClient _httpClient;
    private readonly OfflineQueue _offlineQueue;
    private readonly ISessionPingScheduler _pingScheduler;
    private readonly string _deviceId;
    private string? _sessionId;
    private Task<string>? _startTask;
    private bool _isOnline = true;
    private long? _pausedAtMs;
    private long? _startedAtMs;

    public SessionManager(
        SdkHttpClient httpClient,
        OfflineQueue offlineQueue,
        string deviceId,
        ISessionPingScheduler? pingScheduler = null
    )
    {
        _httpClient = httpClient;
        _offlineQueue = offlineQueue;
        _deviceId = deviceId;
        _pingScheduler = pingScheduler ?? new TimerSessionPingScheduler();
    }

    public async Task<string> StartAsync(bool isOnline)
    {
        if (_startTask != null)
        {
            return await _startTask.ConfigureAwait(false);
        }

        if (!string.IsNullOrEmpty(_sessionId))
        {
            return _sessionId;
        }

        _startTask = StartInternalAsync(isOnline);
        try
        {
            return await _startTask.ConfigureAwait(false);
        }
        finally
        {
            _startTask = null;
        }
    }

    private async Task<string> StartInternalAsync(bool isOnline)
    {
        _pingScheduler.Stop();
        _isOnline = isOnline;
        _sessionId = IdGenerator.GenerateSessionId();

        var validation = Validator.ValidateSessionId(_sessionId);
        if (!validation.Success)
        {
            Logger.Error("Generated session ID invalid. Retrying.");
            _sessionId = IdGenerator.GenerateSessionId();
            if (!Validator.ValidateSessionId(_sessionId).Success)
            {
                Logger.Error("Failed to generate valid session ID.");
            }
        }

        var startedAt = DateTime.UtcNow.ToString("o");
        _startedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var payload = new CreateSessionRequest
        {
            SessionId = _sessionId,
            DeviceId = _deviceId,
            StartedAt = startedAt,
        };

        var persistResult = await StorageService
            .SetItemAsync(StorageKeys.SessionStartedAt, startedAt)
            .ConfigureAwait(false);
        if (!persistResult.Success)
        {
            Logger.Warn(
                "Failed to persist session start time. Session age checks may not work correctly."
            );
        }

        if (isOnline)
        {
            var result = await _httpClient.CreateSessionAsync(payload).ConfigureAwait(false);
            if (!result.Success)
            {
                Logger.Error("Session creation failed. Queuing for retry.", result.Error);
                await _offlineQueue
                    .EnqueueAsync(new BatchSessionItem { Payload = payload })
                    .ConfigureAwait(false);
            }
        }
        else
        {
            await _offlineQueue
                .EnqueueAsync(new BatchSessionItem { Payload = payload })
                .ConfigureAwait(false);
        }

        StartPingInterval();
        return _sessionId;
    }

    public void Pause()
    {
        _pausedAtMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        _pingScheduler.Stop();
    }

    public async Task ResumeAsync()
    {
        if (string.IsNullOrEmpty(_sessionId))
        {
            return;
        }

        var sessionStartedResult = await StorageService
            .GetItemAsync<string>(StorageKeys.SessionStartedAt)
            .ConfigureAwait(false);
        if (sessionStartedResult.Success && !string.IsNullOrEmpty(sessionStartedResult.Data))
        {
            if (
                !DateTimeOffset.TryParse(
                    sessionStartedResult.Data,
                    out var sessionStartTime
                )
            )
            {
                Logger.Warn("Failed to parse session start time.");
                StartPingInterval();
                return;
            }

            var sessionStartMs = sessionStartTime.ToUnixTimeMilliseconds();
            var sessionAge = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - sessionStartMs;
            if (sessionAge > ValidationConstants.MaxSessionAgeMs)
            {
                Logger.Info("Session too old, starting new session");
                _sessionId = null;
                _startedAtMs = null;
                _pausedAtMs = null;
                await StartAsync(_isOnline).ConfigureAwait(false);
                return;
            }
        }

        if (_pausedAtMs.HasValue)
        {
            var inactiveDuration = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - _pausedAtMs.Value;
            if (inactiveDuration > ValidationConstants.InactivityTimeoutMs)
            {
                Logger.Info("Session inactive for too long, starting new session");
                _sessionId = null;
                _startedAtMs = null;
                _pausedAtMs = null;
                await StartAsync(_isOnline).ConfigureAwait(false);
                return;
            }

            _pausedAtMs = null;
        }

        StartPingInterval();
    }

    public string? GetSessionId() => _sessionId;

    public void UpdateNetworkState(bool isOnline)
    {
        _isOnline = isOnline;
    }

    public void Dispose()
    {
        _pingScheduler.Stop();
        if (_pingScheduler is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }

    private void StartPingInterval()
    {
        _pingScheduler.Stop();
        _pingScheduler.Start(() => SendPingAsync());
    }

    private async Task SendPingAsync()
    {
        if (string.IsNullOrEmpty(_sessionId))
        {
            return;
        }

        if (
            _startedAtMs.HasValue
            && DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - _startedAtMs.Value
                >= ValidationConstants.MaxSessionAgeMs
        )
        {
            Logger.Info("Session reached maximum age, starting new session");
            _sessionId = null;
            _startedAtMs = null;
            await StartAsync(_isOnline).ConfigureAwait(false);
            return;
        }

        var payload = new PingSessionRequest
        {
            SessionId = _sessionId,
            Timestamp = DateTime.UtcNow.ToString("o"),
        };

        if (_isOnline)
        {
            var result = await _httpClient.PingSessionAsync(payload).ConfigureAwait(false);
            if (!result.Success)
            {
                Logger.Error("Session ping failed. Queuing for retry.", result.Error);
                await _offlineQueue
                    .EnqueueAsync(new BatchPingItem { Payload = payload })
                    .ConfigureAwait(false);
            }
        }
        else
        {
            await _offlineQueue
                .EnqueueAsync(new BatchPingItem { Payload = payload })
                .ConfigureAwait(false);
        }
    }
}
