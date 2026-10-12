using Phase.Analytics.Client;
using Phase.Analytics.Config;
using Phase.Analytics.Constants;
using Phase.Analytics.Device;
using Phase.Analytics.Models;
using Phase.Analytics.Network;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Tests;

[Collection("PhaseAnalyticsStorage")]
public sealed class EdgeCaseTests
{
    [Fact]
    public async Task Initialize_is_idempotent()
    {
        CreateStorage();
        var transport = new BatchRecordingTransport();
        using var sdk = CreateSdk(transport);

        Assert.True(await sdk.InitializeAsync(ValidConfig()));
        Assert.True(await sdk.InitializeAsync(ValidConfig()));
        Assert.True(sdk.IsInitialized);
        Assert.Empty(transport.Requests);
    }

    [Fact]
    public void Config_NormalizedBaseUrl_strips_trailing_slash()
    {
        var config = new PhaseConfig
        {
            ApiKey = "phase_test_key",
            BaseUrl = "https://api.phase.sh/",
        };

        Assert.Equal("https://api.phase.sh", config.NormalizedBaseUrl);
    }

    [Fact]
    public async Task Flush_before_identify_is_noop()
    {
        CreateStorage();
        var transport = new BatchRecordingTransport();
        using var sdk = CreateSdk(transport);
        await sdk.InitializeAsync(ValidConfig());

        await sdk.FlushAsync();

        Assert.Empty(transport.Requests);
    }

    [Fact]
    public async Task BatchSender_skips_concurrent_flush()
    {
        var storage = CreateStorage();
        var transport = new SlowBatchTransport();
        var client = new SdkHttpClient("phase_test_key", transport);
        using var queue = new OfflineQueue();
        await queue.InitializeAsync();
        queue.Enqueue(
            new BatchDeviceItem
            {
                Payload = new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" },
            }
        );

        var sender = new BatchSender(client, queue);
        var first = sender.FlushAsync();
        var second = sender.FlushAsync();
        await Task.WhenAll(first, second);

        Assert.Equal(1, transport.SendCount);
    }

    [Fact]
    public async Task Double_identify_keeps_same_session()
    {
        CreateStorage();
        var transport = new BatchRecordingTransport();
        using var sdk = CreateSdk(transport);
        await sdk.InitializeAsync(ValidConfig());
        await sdk.IdentifyAsync();

        await sdk.IdentifyAsync(new DeviceProperties { ["tier"] = "pro" });
        await sdk.FlushAsync();

        var items = transport.SentItems();
        Assert.Equal(2, items.Count(item => (string?)item["type"] == "device"));
        Assert.Single(items, item => (string?)item["type"] == "session");
    }

    [Fact]
    public void ValidateDeviceProperties_rejects_nested_values()
    {
        var result = Validator.ValidateDeviceProperties(
            new DeviceProperties
            {
                ["bad"] = new Dictionary<string, object> { ["x"] = 1 },
            }
        );

        Assert.False(result.Success);
    }

    [Fact]
    public async Task ClearLocalData_removes_persisted_keys()
    {
        var storage = CreateStorage();
        await StorageService.SetItemAsync(StorageKeys.DeviceId, "01HXTESTDEVICE0000000001");
        await StorageService.SetItemAsync(StorageKeys.ApiKey, "phase_test_key");

        var result = await PhaseStorage.ClearLocalDataAsync();

        Assert.True(result.Success);
        var device = await storage.GetItemAsync<string>(StorageKeys.DeviceId);
        Assert.True(string.IsNullOrEmpty(device.Data));
    }

    private static PhaseSDK CreateSdk(IHttpTransport transport) =>
        new PhaseSDK(
            new StaticDeviceInfoProvider(new DeviceInfo { Model = "Test" }),
            new AlwaysOnlineNetworkMonitor(),
            transport
        );

    private static PhaseConfig ValidConfig() =>
        new() { ApiKey = "phase_test_key", BaseUrl = "https://api.phase.sh" };

    private static FileStorage CreateStorage()
    {
        var storage = new FileStorage(
            Path.Combine(Path.GetTempPath(), "phase-unity-edge-tests", Guid.NewGuid().ToString("N"))
        );
        StorageService.SetAdapter(storage);
        return storage;
    }

    private sealed class SlowBatchTransport : IHttpTransport
    {
        private int _sendCount;

        public int SendCount => _sendCount;

        public async Task<HttpTransportResponse> SendAsync(
            HttpTransportRequest request,
            CancellationToken cancellationToken
        )
        {
            if (request.Url.EndsWith("/sdk/batch"))
            {
                Interlocked.Increment(ref _sendCount);
                await Task.Delay(200, cancellationToken).ConfigureAwait(false);
            }

            return new HttpTransportResponse(
                200,
                """{"processed":1,"failed":0,"errors":[],"results":[]}"""
            );
        }
    }
}
