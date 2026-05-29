using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;

namespace Phase.Analytics.Tests;

[Collection("PhaseAnalyticsStorage")]
public sealed class OfflineQueueTests : IDisposable
{
    private readonly string _root;
    private readonly OfflineQueue _queue;

    public OfflineQueueTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "phase-unity-queue-tests", Guid.NewGuid().ToString("N"));
        StorageService.SetAdapter(new FileStorage(_root));
        _queue = new OfflineQueue();
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    [Fact]
    public async Task Initialize_loads_persisted_queue()
    {
        await _queue.InitializeAsync();
        await _queue.EnqueueAsync(
            new BatchDeviceItem
            {
                Payload = new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" },
            }
        );

        var secondQueue = new OfflineQueue();
        await secondQueue.InitializeAsync();

        Assert.Equal(1, secondQueue.GetSize());
    }

    [Fact]
    public async Task Enqueue_assigns_incrementing_client_order()
    {
        await _queue.InitializeAsync();

        await _queue.EnqueueAsync(
            new BatchDeviceItem
            {
                Payload = new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" },
            }
        );
        await _queue.EnqueueAsync(
            new BatchSessionItem
            {
                Payload = new CreateSessionRequest
                {
                    SessionId = "01HXTESTSESSION000000001",
                    DeviceId = "01HXTESTDEVICE0000000001",
                    StartedAt = DateTime.UtcNow.ToString("o"),
                },
            }
        );

        var items = await _queue.DequeueAllAsync();
        Assert.Equal(0, items[0].ClientOrder);
        Assert.Equal(1, items[1].ClientOrder);
    }

    [Fact]
    public async Task DequeueAll_clears_queue_and_storage()
    {
        await _queue.InitializeAsync();
        await _queue.EnqueueAsync(
            new BatchDeviceItem
            {
                Payload = new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" },
            }
        );

        var items = await _queue.DequeueAllAsync();
        Assert.Single(items);
        Assert.Equal(0, _queue.GetSize());

        var reloaded = new OfflineQueue();
        await reloaded.InitializeAsync();
        Assert.Equal(0, reloaded.GetSize());
    }

    [Fact]
    public async Task PreserveClientOrder_keeps_existing_order()
    {
        await _queue.InitializeAsync();

        var item = new BatchEventItem
        {
            ClientOrder = 42,
            Payload = new CreateEventRequest
            {
                SessionId = "01HXTESTSESSION000000001",
                Name = "test",
                IsScreen = false,
                Timestamp = DateTime.UtcNow.ToString("o"),
            },
        };

        await _queue.EnqueueAsync(item, preserveClientOrder: true);
        var items = await _queue.DequeueAllAsync();
        Assert.Equal(42, items[0].ClientOrder);
    }

    [Fact]
    public async Task Queue_full_drops_oldest_session_and_related_items()
    {
        await _queue.InitializeAsync();

        await _queue.EnqueueAsync(
            new BatchDeviceItem
            {
                Payload = new CreateDeviceRequest { DeviceId = "01HXTESTDEVICE0000000001" },
            }
        );

        var oldSessionId = "01HXTESTSESSIONOLD0000001";
        var newSessionId = "01HXTESTSESSIONNEW0000001";

        await _queue.EnqueueAsync(
            new BatchSessionItem
            {
                Payload = new CreateSessionRequest
                {
                    SessionId = oldSessionId,
                    DeviceId = "01HXTESTDEVICE0000000001",
                    StartedAt = DateTime.UtcNow.ToString("o"),
                },
            }
        );

        await _queue.EnqueueAsync(
            new BatchEventItem
            {
                Payload = new CreateEventRequest
                {
                    SessionId = oldSessionId,
                    Name = "old_event",
                    IsScreen = false,
                    Timestamp = DateTime.UtcNow.ToString("o"),
                },
            }
        );

        await _queue.EnqueueAsync(
            new BatchSessionItem
            {
                Payload = new CreateSessionRequest
                {
                    SessionId = newSessionId,
                    DeviceId = "01HXTESTDEVICE0000000001",
                    StartedAt = DateTime.UtcNow.ToString("o"),
                },
            }
        );

        while (_queue.GetSize() < ValidationConstants.MaxOfflineQueueSize)
        {
            await _queue.EnqueueAsync(
                new BatchPingItem
                {
                    Payload = new PingSessionRequest
                    {
                        SessionId = newSessionId,
                        Timestamp = DateTime.UtcNow.ToString("o"),
                    },
                }
            );
        }

        await _queue.EnqueueAsync(
            new BatchPingItem
            {
                Payload = new PingSessionRequest
                {
                    SessionId = newSessionId,
                    Timestamp = DateTime.UtcNow.ToString("o"),
                },
            }
        );

        var items = await _queue.DequeueAllAsync();
        Assert.DoesNotContain(
            items,
            item =>
                item is BatchSessionItem session
                    && session.Payload.SessionId == oldSessionId
        );
        Assert.DoesNotContain(
            items,
            item =>
                item is BatchEventItem evt && evt.Payload.SessionId == oldSessionId
        );
        Assert.Contains(
            items,
            item =>
                item is BatchDeviceItem device
                    && device.Payload.DeviceId == "01HXTESTDEVICE0000000001"
        );
    }

    [Fact]
    public async Task ClearLocalData_removes_all_keys()
    {
        await _queue.InitializeAsync();
        await StorageService.SetItemAsync(StorageKeys.DeviceId, "device");
        await StorageService.SetItemAsync(StorageKeys.ApiKey, "phase_test");

        var clear = await StorageService.ClearPhaseDataAsync();
        Assert.True(clear.Success);

        var device = await StorageService.GetItemAsync<string>(StorageKeys.DeviceId);
        Assert.True(device.Success);
        Assert.Null(device.Data);
    }
}
