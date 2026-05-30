using System.Text;
using Newtonsoft.Json;
using Phase.Analytics.Client;
using Phase.Analytics.Config;
using Phase.Analytics.Constants;
using Phase.Analytics.Device;
using Phase.Analytics.Managers;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Tests;

[Collection("PhaseAnalyticsStorage")]
public sealed class ManagersTests
{
    [Fact]
    public async Task DeviceManager_persists_device_and_registers_online()
    {
        var context = CreateContext();
        var deviceId = await context.DeviceManager.InitializeAsync();
        Assert.False(string.IsNullOrEmpty(deviceId));

        await context.DeviceManager.IdentifyAsync(isOnline: true);

        Assert.Contains(context.Transport.Requests, request => request.Url.EndsWith("/sdk/devices"));
        var stored = await context.Storage.GetItemAsync<string>(StorageKeys.DeviceId);
        Assert.Equal(deviceId, stored.Data);
    }

    [Fact]
    public async Task DeviceManager_api_key_change_clears_queue()
    {
        var root = Path.Combine(
            Path.GetTempPath(),
            "phase-unity-manager-tests",
            Guid.NewGuid().ToString("N")
        );
        var storage = new FileStorage(root);
        StorageService.SetAdapter(storage);

        var queue = new OfflineQueue();
        await queue.InitializeAsync();
        await queue.EnqueueAsync(
            new BatchEventItem
            {
                Payload = new CreateEventRequest
                {
                    SessionId = "01HXTESTSESSION000000001",
                    Name = "queued",
                    IsScreen = false,
                    Timestamp = DateTime.UtcNow.ToString("o"),
                },
            }
        );

        await StorageService.SetItemAsync(StorageKeys.ApiKey, "phase_old");
        var oldManager = CreateDeviceManager(storage, queue, "phase_old");
        await oldManager.InitializeAsync();

        var newManager = CreateDeviceManager(storage, queue, "phase_new");
        await newManager.InitializeAsync();
        await Task.Delay(100);

        var reloadedQueue = new OfflineQueue();
        await reloadedQueue.InitializeAsync();
        Assert.Equal(0, reloadedQueue.GetSize());
    }

    [Fact]
    public async Task SessionManager_starts_and_pings()
    {
        var context = CreateContext();
        var deviceId = await context.DeviceManager.InitializeAsync();
        var pingScheduler = new ManualPingScheduler();
        var sessionManager = new SessionManager(
            context.Client,
            context.Queue,
            deviceId,
            pingScheduler
        );

        var sessionId = await sessionManager.StartAsync(isOnline: true);
        Assert.False(string.IsNullOrEmpty(sessionId));

        await pingScheduler.TriggerPingAsync();

        Assert.Contains(
            context.Transport.Requests,
            request => request.Url.EndsWith("/sdk/sessions")
        );
        Assert.Contains(context.Transport.Requests, request => request.Url.EndsWith("/sdk/ping"));
    }

    [Fact]
    public async Task EventManager_tracks_online_and_offline()
    {
        var context = CreateContext();
        var deviceId = await context.DeviceManager.InitializeAsync();
        var sessionManager = new SessionManager(
            context.Client,
            context.Queue,
            deviceId,
            new ManualPingScheduler()
        );
        var eventManager = new EventManager(
            context.Client,
            context.Queue,
            sessionManager.GetSessionId
        );

        await sessionManager.StartAsync(isOnline: true);
        eventManager.Track("level_complete", new EventParams { ["level"] = 1 });
        await Task.Delay(50);

        Assert.Contains(context.Transport.Requests, request => request.Url.EndsWith("/sdk/events"));

        eventManager.UpdateNetworkState(false);
        eventManager.Track("offline_event");

        for (var attempt = 0; attempt < 20 && context.Queue.GetSize() == 0; attempt++)
        {
            await Task.Delay(25);
        }

        Assert.Equal(1, context.Queue.GetSize());
    }

    [Fact]
    public async Task DeviceManager_sends_platform_from_device_info()
    {
        var context = CreateContext(
            deviceInfo: new DeviceInfo
            {
                Platform = "ios",
                OsVersion = "iOS 17.0",
                Locale = "en-US",
                Model = "iPhone",
            }
        );
        await context.DeviceManager.InitializeAsync();
        await context.DeviceManager.IdentifyAsync(isOnline: true);

        var deviceRequest = context.Transport.Requests.First(request =>
            request.Url.EndsWith("/sdk/devices")
        );
        var payload = JsonConvert.DeserializeObject<CreateDeviceRequest>(
            Encoding.UTF8.GetString(deviceRequest.Body)
        );

        Assert.Equal("ios", payload?.Platform);
    }

    [Fact]
    public async Task EventManager_track_screen_sets_is_screen_and_normalizes_name()
    {
        var context = CreateContext();
        var deviceId = await context.DeviceManager.InitializeAsync();
        var sessionManager = new SessionManager(
            context.Client,
            context.Queue,
            deviceId,
            new ManualPingScheduler()
        );
        var eventManager = new EventManager(
            context.Client,
            context.Queue,
            sessionManager.GetSessionId
        );

        await sessionManager.StartAsync(isOnline: true);
        eventManager.Track(ScreenNameNormalizer.Normalize("ProfileView"), null, isScreen: true);
        await Task.Delay(50);

        var eventRequest = context.Transport.Requests.Last(request =>
            request.Url.EndsWith("/sdk/events")
        );
        var payload = JsonConvert.DeserializeObject<CreateEventRequest>(
            Encoding.UTF8.GetString(eventRequest.Body)
        );

        Assert.True(payload?.IsScreen);
        Assert.Equal("/profile-view", payload?.Name);
    }

    [Fact]
    public async Task BatchSender_flush_dequeues_queue()
    {
        var context = CreateContext();
        await context.Queue.InitializeAsync();
        await context.Queue.EnqueueAsync(
            new BatchDeviceItem
            {
                Payload = new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" },
            }
        );

        var sender = new BatchSender(context.Client, context.Queue);
        await sender.FlushAsync();

        Assert.Equal(0, context.Queue.GetSize());
        Assert.Contains(context.Transport.Requests, request => request.Url.EndsWith("/sdk/batch"));
    }

    private static TestContext CreateContext(
        string apiKey = "phase_test_key",
        DeviceInfo? deviceInfo = null
    )
    {
        var storage = new FileStorage(
            Path.Combine(Path.GetTempPath(), "phase-unity-manager-tests", Guid.NewGuid().ToString("N"))
        );
        StorageService.SetAdapter(storage);

        var transport = new RecordingTransport();
        var client = new SdkHttpClient(apiKey, transport);
        var queue = new OfflineQueue();
        queue.InitializeAsync().GetAwaiter().GetResult();
        var deviceManager = CreateDeviceManager(storage, queue, apiKey, transport, deviceInfo);

        return new TestContext(storage, transport, client, queue, deviceManager);
    }

    private static DeviceManager CreateDeviceManager(
        FileStorage storage,
        OfflineQueue queue,
        string apiKey,
        IHttpTransport? transport = null,
        DeviceInfo? deviceInfo = null
    )
    {
        StorageService.SetAdapter(storage);
        var client = new SdkHttpClient(apiKey, transport ?? new RecordingTransport());
        var config = new PhaseConfig
        {
            ApiKey = apiKey,
            DeviceInfo = true,
            UserLocale = true,
        };

        return new DeviceManager(
            client,
            queue,
            new StaticDeviceInfoProvider(
                deviceInfo
                    ?? new DeviceInfo
                    {
                        OsVersion = "TestOS 1.0",
                        Locale = "en-US",
                        Model = "TestDevice",
                        AppVersion = "1.0.0",
                        UnityVersion = "2021.3.0",
                    }
            ),
            config
        );
    }

    private sealed class TestContext
    {
        public TestContext(
            FileStorage storage,
            RecordingTransport transport,
            SdkHttpClient client,
            OfflineQueue queue,
            DeviceManager deviceManager
        )
        {
            Storage = storage;
            Transport = transport;
            Client = client;
            Queue = queue;
            DeviceManager = deviceManager;
        }

        public FileStorage Storage { get; }

        public RecordingTransport Transport { get; }

        public SdkHttpClient Client { get; }

        public OfflineQueue Queue { get; }

        public DeviceManager DeviceManager { get; }
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
                        """{"eventId":"e1","sessionId":"01HXTESTSESSION000000001","deviceId":"01HXTESTDEVICE0000000001","name":"level_complete","isScreen":false,"timestamp":"2026-01-01T00:00:00Z"}"""
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

    private sealed class ManualPingScheduler : ISessionPingScheduler
    {
        private Func<Task>? _onTick;

        public void Start(Func<Task> onTick)
        {
            _onTick = onTick;
        }

        public void Stop()
        {
            _onTick = null;
        }

        public Task TriggerPingAsync()
        {
            return _onTick != null ? _onTick() : Task.CompletedTask;
        }
    }
}
