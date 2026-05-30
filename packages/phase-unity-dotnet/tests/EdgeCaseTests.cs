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
        var transport = new CountingTransport();
        var sdk = CreateSdk(transport);

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
        var transport = new CountingTransport();
        var sdk = CreateSdk(transport);
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
        var queue = new OfflineQueue();
        await queue.InitializeAsync();
        await queue.EnqueueAsync(
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
        var transport = new RecordingTransport();
        var sdk = CreateSdk(transport);
        await sdk.InitializeAsync(ValidConfig());
        await sdk.IdentifyAsync();

        await sdk.IdentifyAsync(new DeviceProperties { ["tier"] = "pro" });

        Assert.Equal(2, transport.DeviceRequestCount);
        Assert.Equal(1, transport.SessionRequestCount);
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

    private sealed class CountingTransport : IHttpTransport
    {
        public List<HttpTransportRequest> Requests { get; } = new();

        public Task<HttpTransportResponse> SendAsync(
            HttpTransportRequest request,
            CancellationToken cancellationToken
        )
        {
            Requests.Add(request);
            return Task.FromResult(new HttpTransportResponse(200, "{}"));
        }
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

    private sealed class RecordingTransport : IHttpTransport
    {
        public int DeviceRequestCount { get; private set; }

        public int SessionRequestCount { get; private set; }

        public Task<HttpTransportResponse> SendAsync(
            HttpTransportRequest request,
            CancellationToken cancellationToken
        )
        {
            if (request.Url.EndsWith("/sdk/devices"))
            {
                DeviceRequestCount++;
                return Task.FromResult(
                    new HttpTransportResponse(
                        200,
                        """{"deviceId":"01HXTESTDEVICE0000000001","firstSeen":"2026-01-01T00:00:00Z"}"""
                    )
                );
            }

            if (request.Url.EndsWith("/sdk/sessions"))
            {
                SessionRequestCount++;
                return Task.FromResult(
                    new HttpTransportResponse(
                        200,
                        """{"sessionId":"01HXTESTSESSION000000001","deviceId":"01HXTESTDEVICE0000000001","startedAt":"2026-01-01T00:00:00Z","lastActivityAt":"2026-01-01T00:00:00Z"}"""
                    )
                );
            }

            if (request.Url.EndsWith("/sdk/events"))
            {
                return Task.FromResult(
                    new HttpTransportResponse(
                        200,
                        """{"eventId":"e1","sessionId":"01HXTESTSESSION000000001","deviceId":"01HXTESTDEVICE0000000001","name":"boot","isScreen":false,"timestamp":"2026-01-01T00:00:00Z"}"""
                    )
                );
            }

            if (request.Url.EndsWith("/sdk/ping"))
            {
                return Task.FromResult(
                    new HttpTransportResponse(
                        200,
                        """{"sessionId":"01HXTESTSESSION000000001","lastActivityAt":"2026-01-01T00:00:00Z"}"""
                    )
                );
            }

            if (request.Url.EndsWith("/sdk/batch"))
            {
                return Task.FromResult(
                    new HttpTransportResponse(
                        200,
                        """{"processed":1,"failed":0,"errors":[],"results":[]}"""
                    )
                );
            }

            return Task.FromResult(new HttpTransportResponse(404, "not found"));
        }
    }
}
