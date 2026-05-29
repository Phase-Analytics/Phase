using Phase.Analytics.Models;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Tests;

public sealed class RateLimiterTests
{
    [Fact]
    public void RateLimiter_blocks_after_limit()
    {
        var limiter = new RateLimiter();
        for (var i = 0; i < 15; i++)
        {
            Assert.True(limiter.CanTrack());
        }

        Assert.False(limiter.CanTrack());
    }

    [Fact]
    public void Deduplicator_blocks_duplicate_within_window()
    {
        var deduplicator = new EventDeduplicator();
        var parameters = new EventParams { ["x"] = 1 };

        Assert.False(deduplicator.IsDuplicate("event", parameters));
        Assert.True(deduplicator.IsDuplicate("event", parameters));
    }
}
