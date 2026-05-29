using System.Text.RegularExpressions;
using Phase.Analytics.Constants;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Tests;

public sealed class IdGeneratorTests
{
    private static readonly Regex IdPattern = new(
        ValidationConstants.DeviceIdPattern,
        RegexOptions.Compiled
    );

    [Fact]
    public void Generate_returns_26_char_ulid()
    {
        var id = IdGenerator.Generate();
        Assert.Equal(26, id.Length);
        Assert.Matches(IdPattern, id);
    }

    [Fact]
    public void Generate_is_unique_over_burst()
    {
        var ids = new HashSet<string>();
        for (var i = 0; i < 1000; i++)
        {
            ids.Add(IdGenerator.Generate());
        }

        Assert.Equal(1000, ids.Count);
    }

    [Fact]
    public void Generate_produces_distinct_consecutive_values()
    {
        var first = IdGenerator.Generate();
        var second = IdGenerator.Generate();
        Assert.NotEqual(first, second);
    }
}
