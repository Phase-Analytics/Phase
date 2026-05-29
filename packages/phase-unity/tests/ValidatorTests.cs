using Phase.Analytics.Utils;

namespace Phase.Analytics.Tests;

public sealed class ValidatorTests
{
    [Fact]
    public void ValidateApiKey_rejects_empty()
    {
        var result = Validator.ValidateApiKey("");
        Assert.False(result.Success);
    }

    [Fact]
    public void ValidateApiKey_rejects_invalid_prefix()
    {
        var result = Validator.ValidateApiKey("invalid_key");
        Assert.False(result.Success);
    }

    [Fact]
    public void ValidateApiKey_accepts_phase_prefix()
    {
        var result = Validator.ValidateApiKey("phase_test_key");
        Assert.True(result.Success);
    }

    [Fact]
    public void ValidateBaseUrl_requires_https()
    {
        var result = Validator.ValidateBaseUrl("http://api.example.com", allowInsecureDev: false);
        Assert.False(result.Success);
    }

    [Fact]
    public void ValidateBaseUrl_allows_http_in_dev()
    {
        var result = Validator.ValidateBaseUrl("http://localhost:3000", allowInsecureDev: true);
        Assert.True(result.Success);
    }

    [Fact]
    public void ValidateEventName_accepts_valid_names()
    {
        Assert.True(Validator.ValidateEventName("level_complete").Success);
        Assert.True(Validator.ValidateEventName("user.signup").Success);
        Assert.True(Validator.ValidateEventName("payment/success").Success);
    }

    [Fact]
    public void ValidateEventName_rejects_invalid_characters()
    {
        Assert.False(Validator.ValidateEventName("bad@event").Success);
    }

    [Fact]
    public void ValidateEventParams_rejects_nested_objects()
    {
        var nested = new Dictionary<string, object>
        {
            ["meta"] = new Dictionary<string, object> { ["a"] = 1 },
        };

        var result = Validator.ValidateEventParams(nested);
        Assert.False(result.Success);
    }

    [Fact]
    public void ValidateEventParams_normalizes_and_sorts_keys()
    {
        var result = Validator.ValidateEventParams(
            new Dictionary<string, object>
            {
                ["b"] = 2,
                ["a"] = 1,
            }
        );

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal(new[] { "a", "b" }, result.Data!.Keys.ToArray());
    }

    [Fact]
    public void ValidateEventParams_rejects_long_strings()
    {
        var result = Validator.ValidateEventParams(
            new Dictionary<string, object> { ["x"] = new string('a', 257) }
        );

        Assert.False(result.Success);
    }

    [Fact]
    public void ValidateEventParams_empty_returns_null()
    {
        var result = Validator.ValidateEventParams(new Dictionary<string, object>());
        Assert.True(result.Success);
        Assert.Null(result.Data);
    }

    [Fact]
    public void ValidateDeviceId_accepts_ulid()
    {
        var id = IdGenerator.GenerateDeviceId();
        Assert.True(Validator.ValidateDeviceId(id).Success);
    }
}
