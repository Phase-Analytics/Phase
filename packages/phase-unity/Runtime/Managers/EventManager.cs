using System;
using System.Threading.Tasks;
using Phase.Analytics.Client;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Managers;

public sealed class EventManager
{
    private readonly SdkHttpClient _httpClient;
    private readonly OfflineQueue _offlineQueue;
    private readonly Func<string?> _getSessionId;
    private readonly Action _markActivity;
    private readonly RateLimiter _rateLimiter = new();
    private readonly EventDeduplicator _deduplicator = new();
    private bool _isOnline = true;

    public EventManager(
        SdkHttpClient httpClient,
        OfflineQueue offlineQueue,
        Func<string?> getSessionId,
        Action? markActivity = null
    )
    {
        _httpClient = httpClient;
        _offlineQueue = offlineQueue;
        _getSessionId = getSessionId;
        _markActivity = markActivity ?? (() => { });
    }

    public void UpdateNetworkState(bool isOnline)
    {
        _isOnline = isOnline;
    }

    public void Track(string name, EventParams? parameters = null)
    {
        if (!Validator.ValidateEventName(name).Success)
        {
            Logger.Error("Invalid event name. Use alphanumeric, _, -, ., /, or space");
            return;
        }

        var paramsValidation = Validator.ValidateEventParams(parameters);
        if (!paramsValidation.Success)
        {
            Logger.Error(
                "Invalid event params. Use up to 32 primitive keys. Keys max 32 chars. String values max 256 chars. Payload max 8 KB."
            );
            return;
        }

        var normalizedParams = paramsValidation.Data;
        if (!_rateLimiter.CanTrack())
        {
            return;
        }

        if (_deduplicator.IsDuplicate(name, normalizedParams))
        {
            Logger.Warn("Duplicate event detected. Ignoring.", new System.Collections.Generic.Dictionary<string, object> { ["name"] = name });
            return;
        }

        var sessionId = _getSessionId();
        if (string.IsNullOrEmpty(sessionId))
        {
            Logger.Error("Session not started. Cannot track event.");
            return;
        }

        var payload = new CreateEventRequest
        {
            SessionId = sessionId,
            Name = name,
            Params = normalizedParams,
            IsScreen = false,
            Timestamp = DateTime.UtcNow.ToString("o"),
        };

        _ = SendEventAsync(payload);
    }

    private async Task SendEventAsync(CreateEventRequest payload)
    {
        try
        {
            if (_isOnline)
            {
                var result = await _httpClient.CreateEventAsync(payload).ConfigureAwait(false);
                if (!result.Success)
                {
                    Logger.Error("Event tracking failed. Queuing for retry.", result.Error);
                    await _offlineQueue
                        .EnqueueAsync(new BatchEventItem { Payload = payload })
                        .ConfigureAwait(false);
                    return;
                }

                _markActivity();
                return;
            }

            await _offlineQueue
                .EnqueueAsync(new BatchEventItem { Payload = payload })
                .ConfigureAwait(false);
        }
        catch (Exception error)
        {
            Logger.Error("Unhandled error in sendEvent. Event may be lost.", error);
        }
    }
}
