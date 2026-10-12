using Phase.Analytics.Config;
using Phase.Analytics.Device;
using Phase.Analytics.Models;
using Phase.Analytics.Network;
using Phase.Analytics.Storage;

namespace Phase.Analytics.Tests;

[Collection("PhaseAnalyticsStorage")]
public sealed class PhaseSdkTests
{
    [Fact]
    public async Task Initialize_rejects_invalid_api_key()
    {
        var storage = CreateStorage();
        using var sdk = new PhaseSDK(
            new StaticDeviceInfoProvider(new DeviceInfo()),
            new AlwaysOnlineNetworkMonitor(),
            new BatchRecordingTransport()
        );

        var success = await sdk.InitializeAsync(
            new PhaseConfig { ApiKey = "invalid", BaseUrl = "https://api.phase.sh" }
        );

        Assert.False(success);
        Assert.False(sdk.IsInitialized);
    }

    [Fact]
    public async Task Identify_before_init_is_replayed_after_init()
    {
        var storage = CreateStorage();
        var transport = new BatchRecordingTransport();
        using var sdk = new PhaseSDK(
            new StaticDeviceInfoProvider(
                new DeviceInfo { OsVersion = "TestOS", Locale = "en-US", Model = "Test" }
            ),
            new AlwaysOnlineNetworkMonitor(),
            transport
        );

        var identifyTask = sdk.IdentifyAsync();
        sdk.Track("early_event");

        var initialized = await sdk.InitializeAsync(
            new PhaseConfig { ApiKey = "phase_test_key", BaseUrl = "https://api.phase.sh" }
        );

        Assert.True(initialized);
        await identifyTask;

        Assert.True(sdk.IsIdentified);
        sdk.Track("level_complete", new EventParams { ["level"] = 1 });
        await sdk.FlushAsync();

        var items = transport.SentItems();
        Assert.Contains(items, item => (string?)item["type"] == "device");
        Assert.Contains(items, item => (string?)item["type"] == "session");
        Assert.Contains(items, item => (string?)item["payload"]?["name"] == "early_event");
        Assert.Contains(items, item => (string?)item["payload"]?["name"] == "level_complete");
    }

    [Fact]
    public async Task PhaseAnalytics_initialize_validates_config()
    {
        CreateStorage();
        var success = await PhaseAnalytics.InitializeAsync(
            new PhaseConfig { ApiKey = string.Empty, BaseUrl = "https://api.phase.sh" }
        );

        Assert.False(success);
        Assert.False(PhaseAnalytics.IsInitialized);
    }

    private static FileStorage CreateStorage()
    {
        var storage = new FileStorage(
            Path.Combine(
                Path.GetTempPath(),
                "phase-unity-sdk-tests",
                Guid.NewGuid().ToString("N")
            )
        );
        StorageService.SetAdapter(storage);
        return storage;
    }
}
