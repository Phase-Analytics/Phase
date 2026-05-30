using Phase.Analytics.Client;
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
        var sdk = new PhaseSDK(
            new StaticDeviceInfoProvider(new DeviceInfo()),
            new AlwaysOnlineNetworkMonitor(),
            new RecordingTransport()
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
        var transport = new RecordingTransport();
        var sdk = new PhaseSDK(
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
        await Task.Delay(100);

        Assert.Contains(transport.Requests, request => request.Url.EndsWith("/sdk/devices"));
        Assert.Contains(transport.Requests, request => request.Url.EndsWith("/sdk/sessions"));
        Assert.Contains(transport.Requests, request => request.Url.EndsWith("/sdk/events"));
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

    private sealed class RecordingTransport : IHttpTransport
    {
        public List<HttpTransportRequest> Requests { get; } = new();

        public Task<HttpTransportResponse> SendAsync(
            HttpTransportRequest request,
            CancellationToken cancellationToken
        )
        {
            Requests.Add(request);

            if (request.Url.EndsWith("/sdk/devices"))
            {
                return Task.FromResult(
                    new HttpTransportResponse(
                        200,
                        """{"deviceId":"01HXTESTDEVICE0000000001","firstSeen":"2026-01-01T00:00:00Z"}"""
                    )
                );
            }

            if (request.Url.EndsWith("/sdk/sessions"))
            {
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
