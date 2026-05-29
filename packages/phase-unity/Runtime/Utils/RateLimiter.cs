using System;
using System.Collections.Generic;
using System.Linq;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;

namespace Phase.Analytics.Utils;

public sealed class RateLimiter
{
    private readonly List<long> _eventTimestamps = new();

    public bool CanTrack()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        _eventTimestamps.RemoveAll(
            timestamp => now - timestamp >= ValidationConstants.RateLimitWindowMs
        );

        if (_eventTimestamps.Count >= ValidationConstants.MaxEventsPerSecond)
        {
            Logger.Info(
                $"Rate limit exceeded: {ValidationConstants.MaxEventsPerSecond} events/second. Dropping event."
            );
            return false;
        }

        _eventTimestamps.Add(now);
        return true;
    }

    public void Reset()
    {
        _eventTimestamps.Clear();
    }
}

public sealed class EventDeduplicator
{
    private readonly Dictionary<string, long> _recentEvents = new();

    public bool IsDuplicate(string name, EventParams? parameters)
    {
        var key = CreateKey(name, parameters);
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        if (
            _recentEvents.TryGetValue(key, out var lastTime)
            && now - lastTime < ValidationConstants.DedupWindowMs
        )
        {
            return true;
        }

        _recentEvents[key] = now;
        Cleanup(now);
        return false;
    }

    public void Reset()
    {
        _recentEvents.Clear();
    }

    private static string CreateKey(string name, EventParams? parameters)
    {
        if (parameters == null || parameters.Count == 0)
        {
            return name;
        }

        try
        {
            var sortedKeys = parameters.Keys.OrderBy(static key => key, StringComparer.Ordinal).ToList();
            var normalized = new EventParams();
            foreach (var key in sortedKeys)
            {
                normalized[key] = parameters[key];
            }

            return $"{name}:{JsonHelper.Serialize(normalized)}";
        }
        catch
        {
            return name;
        }
    }

    private void Cleanup(long now)
    {
        var keysToRemove = _recentEvents
            .Where(entry => now - entry.Value > ValidationConstants.DedupWindowMs)
            .Select(entry => entry.Key)
            .ToList();

        foreach (var key in keysToRemove)
        {
            _recentEvents.Remove(key);
        }
    }
}
