using System;
using System.Collections.Generic;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Managers;

public sealed class EventManager
{
    private readonly OfflineQueue _offlineQueue;
    private readonly Func<string?> _getSessionId;
    private readonly Action _markActivity;
    private readonly Action _onEnqueued;
    private readonly object _sync = new();
    private readonly RateLimiter _rateLimiter = new();
    private readonly EventDeduplicator _deduplicator = new();

    public EventManager(
        OfflineQueue offlineQueue,
        Func<string?> getSessionId,
        Action? markActivity = null,
        Action? onEnqueued = null
    )
    {
        _offlineQueue = offlineQueue;
        _getSessionId = getSessionId;
        _markActivity = markActivity ?? (() => { });
        _onEnqueued = onEnqueued ?? (() => { });
    }

    public void Track(string name, EventParams? parameters = null, bool isScreen = false)
    {
        var pending = Capture(name, parameters, isScreen);
        if (pending == null)
        {
            return;
        }

        lock (_sync)
        {
            if (!_rateLimiter.CanTrack())
            {
                return;
            }

            if (_deduplicator.IsDuplicate(name, pending.Params))
            {
                Logger.Warn(
                    "Duplicate event detected. Ignoring.",
                    new Dictionary<string, object> { ["name"] = name }
                );
                return;
            }
        }

        Enqueue(pending, notBeforeUtc: null);
    }

    /// <summary>
    /// Enqueues an event captured before identify. Rate limiting and dedup are skipped: they would
    /// judge the burst by replay time rather than by when the calls happened. The timestamp is
    /// raised to <paramref name="notBeforeUtc"/> because the server rejects events that predate
    /// their session.
    /// </summary>
    public void TrackPending(PendingEvent pending, DateTime? notBeforeUtc)
    {
        Enqueue(pending, notBeforeUtc);
    }

    /// <summary>Validates and stamps an event with its id and timestamp. Returns null if invalid.</summary>
    public static PendingEvent? Capture(string name, EventParams? parameters, bool isScreen)
    {
        if (!Validator.ValidateEventName(name).Success)
        {
            Logger.Error("Invalid event name. Use alphanumeric, _, -, ., /, or space");
            return null;
        }

        var paramsValidation = Validator.ValidateEventParams(parameters);
        if (!paramsValidation.Success)
        {
            Logger.Error(
                "Invalid event params. Use up to 32 primitive keys. Keys max 32 chars. String values max 256 chars. Payload max 8 KB."
            );
            return null;
        }

        return new PendingEvent(
            IdGenerator.GenerateEventId(),
            name,
            paramsValidation.Data,
            isScreen,
            DateTime.UtcNow
        );
    }

    private void Enqueue(PendingEvent pending, DateTime? notBeforeUtc)
    {
        var sessionId = _getSessionId();
        if (string.IsNullOrEmpty(sessionId))
        {
            Logger.Error("Session not started. Cannot track event.");
            return;
        }

        var timestamp = notBeforeUtc.HasValue && notBeforeUtc.Value > pending.TimestampUtc
            ? notBeforeUtc.Value
            : pending.TimestampUtc;

        _offlineQueue.Enqueue(
            new BatchEventItem
            {
                Payload = new CreateEventRequest
                {
                    EventId = pending.EventId,
                    SessionId = sessionId!,
                    Name = pending.Name,
                    Params = pending.Params,
                    IsScreen = pending.IsScreen,
                    Timestamp = timestamp.ToString("o"),
                },
            }
        );

        _markActivity();
        _onEnqueued();
    }
}
