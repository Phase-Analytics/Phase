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
    public async Task DeviceManager_persists_ulid_device_id_and_queues_identify()
    {
        using var context = CreateContext();
        var deviceId = await context.DeviceManager.InitializeAsync();
        Assert.True(Validator.IsUlid(deviceId));

        context.DeviceManager.Identify();

        var device = Assert.IsType<BatchDeviceItem>(Assert.Single(context.Queue.PeekBatch(10)));
        Assert.Equal(deviceId, device.Payload.DeviceId);
        var stored = await context.Storage.GetItemAsync<string>(StorageKeys.DeviceId);
        Assert.Equal(deviceId, stored.Data);
    }

    [Fact]
    public async Task DeviceManager_api_key_change_clears_queue()
    {
        using var context = CreateContext();
        context.Queue.Enqueue(
            new BatchEventItem
            {
                Payload = new CreateEventRequest
                {
                    SessionId = "01HXTESTSESSION000000001",
                    Name = "queued",
                    Timestamp = DateTime.UtcNow.ToString("o"),
                },
            }
        );
        await context.Queue.PersistAsync();

        await StorageService.SetItemAsync(StorageKeys.ApiKey, "phase_old");
        var oldDeviceId = await CreateDeviceManager(context.Queue, "phase_old").InitializeAsync();
        var newDeviceId = await CreateDeviceManager(context.Queue, "phase_new").InitializeAsync();

        Assert.NotEqual(oldDeviceId, newDeviceId);
        using var reloadedQueue = new OfflineQueue();
        await reloadedQueue.InitializeAsync();
        Assert.Equal(0, reloadedQueue.GetSize());
    }

    [Fact]
    public async Task DeviceManager_sends_platform_from_device_info()
    {
        using var context = CreateContext(
            deviceInfo: new DeviceInfo
            {
                Platform = "ios",
                OsVersion = "17.0",
                Locale = "en-US",
                Model = "iPhone",
            }
        );
        await context.DeviceManager.InitializeAsync();
        context.DeviceManager.Identify();

        var device = Assert.IsType<BatchDeviceItem>(Assert.Single(context.Queue.PeekBatch(10)));
        Assert.Equal("ios", device.Payload.Platform);
    }

    [Fact]
    public async Task SessionManager_queues_session_and_pings()
    {
        using var context = CreateContext();
        await context.DeviceManager.InitializeAsync();
        var pingScheduler = new ManualPingScheduler();
        using var sessionManager = new SessionManager(
            context.Queue,
            context.DeviceManager.GetDeviceId,
            pingScheduler
        );

        var sessionId = sessionManager.Start();
        Assert.False(string.IsNullOrEmpty(sessionId));

        await pingScheduler.TriggerPingAsync();

        var items = context.Queue.PeekBatch(10);
        Assert.Contains(items, item => item is BatchSessionItem s && s.Payload.SessionId == sessionId);
        Assert.Contains(items, item => item is BatchPingItem p && p.Payload.SessionId == sessionId);
    }

    [Fact]
    public async Task EventManager_buffers_until_attached_and_keeps_call_time()
    {
        using var context = CreateContext();
        await context.DeviceManager.InitializeAsync();
        using var sessionManager = new SessionManager(
            context.Queue,
            context.DeviceManager.GetDeviceId,
            new ManualPingScheduler()
        );
        var eventManager = new EventManager();

        eventManager.Track("early_event");
        var earliest = eventManager.GetEarliestPendingUtc();
        Assert.NotNull(earliest);
        Assert.Equal(0, context.Queue.GetSize());

        await Task.Delay(20);
        sessionManager.Start(earliest);
        eventManager.Attach(context.Queue, sessionManager.GetSessionId, () => { });

        var queued = context.Queue.PeekBatch(10).OfType<BatchEventItem>().Single();
        var session = context.Queue.PeekBatch(10).OfType<BatchSessionItem>().Single();
        Assert.Equal(earliest.Value.ToString("o"), queued.Payload.Timestamp);
        Assert.Equal(earliest.Value.ToString("o"), session.Payload.StartedAt);
        Assert.True(Validator.IsUlid(queued.Payload.EventId));
    }

    [Fact]
    public async Task BatchSender_flush_dequeues_queue()
    {
        using var context = CreateContext();
        context.Queue.Enqueue(
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

    private static TestContext CreateContext(DeviceInfo? deviceInfo = null)
    {
        var storage = new FileStorage(
            Path.Combine(Path.GetTempPath(), "phase-unity-manager-tests", Guid.NewGuid().ToString("N"))
        );
        StorageService.SetAdapter(storage);

        var transport = new BatchRecordingTransport();
        var client = new SdkHttpClient("phase_test_key", transport);
        var queue = new OfflineQueue();
        queue.InitializeAsync().GetAwaiter().GetResult();
        var deviceManager = CreateDeviceManager(queue, "phase_test_key", deviceInfo);

        return new TestContext(storage, transport, client, queue, deviceManager);
    }

    private static DeviceManager CreateDeviceManager(
        OfflineQueue queue,
        string apiKey,
        DeviceInfo? deviceInfo = null
    )
    {
        var config = new PhaseConfig
        {
            ApiKey = apiKey,
            DeviceInfo = true,
            UserLocale = true,
        };

        return new DeviceManager(
            queue,
            new StaticDeviceInfoProvider(
                deviceInfo
                    ?? new DeviceInfo
                    {
                        OsVersion = "1.0",
                        Locale = "en-US",
                        Model = "TestDevice",
                        AppVersion = "1.0.0",
                        UnityVersion = "2021.3.0",
                    }
            ),
            config
        );
    }

    private sealed class TestContext : IDisposable
    {
        public TestContext(
            FileStorage storage,
            BatchRecordingTransport transport,
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

        public BatchRecordingTransport Transport { get; }

        public SdkHttpClient Client { get; }

        public OfflineQueue Queue { get; }

        public DeviceManager DeviceManager { get; }

        public void Dispose()
        {
            Queue.Dispose();
        }
    }
}

internal sealed class ManualPingScheduler : ISessionPingScheduler
{
    private Func<Task>? _onTick;

    public void Start(Func<Task> onTick, DateTimeOffset sessionStartedAt)
    {
        _onTick = onTick;
    }

    public void NotifyActivity() { }

    public void Stop()
    {
        _onTick = null;
    }

    public Task TriggerPingAsync()
    {
        return _onTick != null ? _onTick() : Task.CompletedTask;
    }
}
