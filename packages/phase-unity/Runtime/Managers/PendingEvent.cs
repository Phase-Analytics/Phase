using System;
using Phase.Analytics.Models;

namespace Phase.Analytics.Managers;

/// <summary>A validated event stamped at call time, waiting for a session.</summary>
internal sealed class PendingEvent
{
    public PendingEvent(
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
