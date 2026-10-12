using System;
using System.Collections.Generic;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Managers;

/// <summary>
/// Validates and stamps events at call time (id + timestamp), then queues them, or buffers them
/// until a session exists (before initialize/identify).
/// </summary>
public sealed class EventManager
{
    private readonly object _sync = new();
    private readonly RateLimiter _rateLimiter = new();
    private readonly EventDeduplicator _deduplicator = new();
    private readonly List<PendingEvent> _pending = new();
    private OfflineQueue? _queue;
    private Func<string?>? _getSessionId;
    private Action? _onEnqueued;

    public void Track(string name, EventParams? parameters = null, bool isScreen = false)
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

        lock (_sync)
        {
            if (!_rateLimiter.CanTrack())
            {
                return;
            }

            if (_deduplicator.IsDuplicate(name, paramsValidation.Data))
            {
                Logger.Warn(
                    "Duplicate event detected. Ignoring.",
                    new Dictionary<string, object> { ["name"] = name }
                );
                return;
            }

            var pending = new PendingEvent(
                IdGenerator.GenerateEventId(),
                name,
                paramsValidation.Data,
                isScreen,
                DateTime.UtcNow
            );

            if (!WriteLocked(pending))
            {
                BufferLocked(pending);
            }
        }
    }

    /// <summary>Earliest timestamp among buffered events that can still be delivered.</summary>
    public DateTime? GetEarliestPendingUtc()
    {
        lock (_sync)
        {
            DropExpiredLocked();
            return _pending.Count > 0 ? _pending[0].TimestampUtc : null;
        }
    }

    /// <summary>
    /// Starts delivering to <paramref name="queue"/> and replays the buffer. Replayed events skip the
    /// rate limiter and dedup: they were already checked when tracked.
    /// </summary>
    public void Attach(OfflineQueue queue, Func<string?> getSessionId, Action onEnqueued)
    {
        lock (_sync)
        {
            _queue = queue;
            _getSessionId = getSessionId;
            _onEnqueued = onEnqueued;
            DropExpiredLocked();

            if (_pending.Count == 0)
            {
                return;
            }

            Logger.Info($"Replaying {_pending.Count} event(s) tracked before identify");
            var buffered = _pending.ToArray();
            _pending.Clear();
            foreach (var pending in buffered)
            {
                if (!WriteLocked(pending))
                {
                    BufferLocked(pending);
                }
            }
        }
    }

    /// <summary>Stops delivering; later events are buffered until the next <see cref="Attach"/>.</summary>
    public void Detach()
    {
        lock (_sync)
        {
            _queue = null;
            _getSessionId = null;
            _onEnqueued = null;
        }
    }

    private bool WriteLocked(PendingEvent pending)
    {
        var sessionId = _getSessionId?.Invoke();
        if (_queue == null || string.IsNullOrEmpty(sessionId))
        {
            return false;
        }

        _queue.Enqueue(
            new BatchEventItem
            {
                Payload = new CreateEventRequest
                {
                    EventId = pending.EventId,
                    SessionId = sessionId!,
                    Name = pending.Name,
                    Params = pending.Params,
                    IsScreen = pending.IsScreen,
                    Timestamp = pending.TimestampUtc.ToString("o"),
                },
            }
        );

        _onEnqueued?.Invoke();
        return true;
    }

    private void BufferLocked(PendingEvent pending)
    {
        if (_pending.Count >= ValidationConstants.MaxPendingEvents)
        {
            var dropped = _pending[0];
            _pending.RemoveAt(0);
            Logger.Warn(
                $"More than {ValidationConstants.MaxPendingEvents} events tracked before identify. Dropping the oldest.",
                new Dictionary<string, object> { ["name"] = dropped.Name }
            );
        }

        _pending.Add(pending);
    }

    private void DropExpiredLocked()
    {
        var cutoff = DateTime.UtcNow.AddMilliseconds(-ValidationConstants.MaxPendingEventAgeMs);
        var dropped = _pending.RemoveAll(pending => pending.TimestampUtc < cutoff);
        if (dropped > 0)
        {
            Logger.Warn($"Dropped {dropped} event(s) buffered for over an hour without identify.");
        }
    }
}
