using System;
using Phase.Analytics.Models;

namespace Phase.Analytics.Managers;

/// <summary>A validated event captured at call time, before it can be attached to a session.</summary>
public sealed class PendingEvent
{
    internal PendingEvent(
        string eventId,
        string name,
        EventParams? parameters,
        bool isScreen,
        DateTime timestampUtc
    )
    {
        EventId = eventId;
        Name = name;
        Params = parameters;
        IsScreen = isScreen;
        TimestampUtc = timestampUtc;
    }

    public string EventId { get; }

    public string Name { get; }

    public EventParams? Params { get; }

    public bool IsScreen { get; }

    public DateTime TimestampUtc { get; }
}
