using Phase.Analytics.Client;
using Phase.Analytics.Constants;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;

namespace Phase.Analytics.Tests;

[Collection("PhaseAnalyticsStorage")]
public sealed class OfflineQueueTests : IDisposable
{
    private const string DeviceId = "01HXTESTDEVICE0000000001";
    private const string SessionId = "01HXTESTSESSION000000001";

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
        _queue.Dispose();
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    [Fact]
    public async Task Initialize_loads_persisted_queue()
    {
        await _queue.InitializeAsync();
        var session = Session(SessionId);
        _queue.Enqueue(Device());
        _queue.Enqueue(session);
        await _queue.PersistAsync();

        using var secondQueue = new OfflineQueue();
        await secondQueue.InitializeAsync();

        var items = secondQueue.PeekBatch(10);
        Assert.Equal(2, items.Count);
        // Timestamps must survive as ISO strings; the server rejects anything else.
        var reloaded = Assert.IsType<BatchSessionItem>(items[1]);
        Assert.Equal(session.Payload.StartedAt, reloaded.Payload.StartedAt);
    }

    [Fact]
    public async Task Enqueue_assigns_incrementing_client_order()
    {
        await _queue.InitializeAsync();

        _queue.Enqueue(Device());
        _queue.Enqueue(Session(SessionId));

        var items = _queue.PeekBatch(10);
        Assert.Equal(0, items[0].ClientOrder);
        Assert.Equal(1, items[1].ClientOrder);
    }

    [Fact]
    public async Task Queue_full_drops_oldest_session_and_related_items()
    {
        await _queue.InitializeAsync();

        var oldSessionId = "01HXTESTSESSIONOLD0000001";
        var newSessionId = "01HXTESTSESSIONNEW0000001";

        _queue.Enqueue(Device());
        _queue.Enqueue(Session(oldSessionId));
        _queue.Enqueue(Event(oldSessionId, "old_event"));
        _queue.Enqueue(Session(newSessionId));

        while (_queue.GetSize() < ValidationConstants.MaxOfflineQueueSize)
        {
            _queue.Enqueue(Event(newSessionId, "filler"));
        }

        _queue.Enqueue(Event(newSessionId, "overflow"));

        var items = _queue.PeekBatch(ValidationConstants.MaxOfflineQueueSize);
        Assert.DoesNotContain(items, item => item is BatchSessionItem s && s.Payload.SessionId == oldSessionId);
        Assert.DoesNotContain(items, item => item is BatchEventItem e && e.Payload.SessionId == oldSessionId);
        Assert.Contains(items, item => item is BatchDeviceItem);
        Assert.Contains(items, item => item is BatchEventItem e && e.Payload.Name == "overflow");
    }

    [Fact]
    public async Task Failed_send_keeps_items_queued_and_persisted()
    {
        await _queue.InitializeAsync();
        _queue.Enqueue(Device());
        _queue.Enqueue(Session(SessionId));
        await _queue.PersistAsync();

        var transport = new BatchRecordingTransport(_ => new HttpTransportResponse(0, "offline"));
        await new BatchSender(new SdkHttpClient("phase_test_key", transport), _queue).FlushAsync();

        Assert.NotEmpty(transport.Requests);
        Assert.Equal(2, _queue.GetSize());

        using var reloaded = new OfflineQueue();
        await reloaded.InitializeAsync();
        Assert.Equal(2, reloaded.GetSize());
    }

    [Fact]
    public async Task Partial_response_removes_acked_and_rejected_items_and_keeps_retryable()
    {
        await _queue.InitializeAsync();
        _queue.Enqueue(Device());
        _queue.Enqueue(Event(SessionId, "rejected"));
        _queue.Enqueue(Event(SessionId, "retryable"));
        _queue.Enqueue(Event(SessionId, "missing_flag"));

        var transport = new BatchRecordingTransport(_ =>
            new HttpTransportResponse(
                207,
                """
                {"processed":1,"failed":3,"results":[],"errors":[
                  {"clientOrder":1,"code":"VALIDATION_ERROR","detail":"bad","retryable":false},
                  {"clientOrder":2,"code":"INTERNAL_SERVER_ERROR","detail":"later","retryable":true},
                  {"clientOrder":3,"code":"NOT_FOUND","detail":"no flag"}
                ]}
                """
            )
        );
        var sender = new BatchSender(new SdkHttpClient("phase_test_key", transport), _queue);
        await sender.FlushAsync();

        var remaining = Assert.Single(_queue.PeekBatch(10));
        var retryable = Assert.IsType<BatchEventItem>(remaining);
        Assert.Equal("retryable", retryable.Payload.Name);
        Assert.Equal(1, retryable.RetryCount);
    }

    [Fact]
    public async Task Retryable_item_is_dropped_after_retry_cap()
    {
        await _queue.InitializeAsync();
        _queue.Enqueue(Event(SessionId, "always_failing"));

        var transport = new BatchRecordingTransport(_ =>
            new HttpTransportResponse(
                207,
                """{"processed":0,"failed":1,"results":[],"errors":[{"clientOrder":0,"code":"X","detail":"x","retryable":true}]}"""
            )
        );
        var sender = new BatchSender(new SdkHttpClient("phase_test_key", transport), _queue);
        for (var attempt = 0; attempt < ValidationConstants.MaxItemRetryAttempts; attempt++)
        {
            Assert.Equal(1, _queue.GetSize());
            await sender.FlushAsync(ignoreBackoff: true);
        }

        Assert.Equal(0, _queue.GetSize());
    }

    [Fact]
    public async Task Items_enqueued_during_flush_survive_the_ack()
    {
        await _queue.InitializeAsync();
        _queue.Enqueue(Device());

        var requests = 0;
        var transport = new BatchRecordingTransport(_ =>
        {
            if (Interlocked.Increment(ref requests) == 1)
            {
                _queue.Enqueue(Event(SessionId, "during_flush"));
                return BatchRecordingTransport.Ok();
            }

            // Stop the flush loop so the late item stays queued.
            return new HttpTransportResponse(429, "{}", retryAfter: "60");
        });
        var sender = new BatchSender(new SdkHttpClient("phase_test_key", transport), _queue);
        await sender.FlushAsync();

        var remaining = Assert.Single(_queue.PeekBatch(10));
        Assert.Equal("during_flush", Assert.IsType<BatchEventItem>(remaining).Payload.Name);
    }

    [Fact]
    public async Task Non_retryable_status_drops_batch()
    {
        await _queue.InitializeAsync();
        _queue.Enqueue(Device());

        var transport = new BatchRecordingTransport(_ => new HttpTransportResponse(400, "{}"));
        await new BatchSender(new SdkHttpClient("phase_test_key", transport), _queue).FlushAsync();

        Assert.Single(transport.Requests);
        Assert.Equal(0, _queue.GetSize());
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

    private static BatchDeviceItem Device() =>
        new() { Payload = new CreateDeviceRequest { DeviceId = DeviceId } };

    private static BatchSessionItem Session(string sessionId) =>
        new()
        {
            Payload = new CreateSessionRequest
            {
                SessionId = sessionId,
                DeviceId = DeviceId,
                StartedAt = DateTime.UtcNow.ToString("o"),
            },
        };

    private static BatchEventItem Event(string sessionId, string name) =>
        new()
        {
            Payload = new CreateEventRequest
            {
                SessionId = sessionId,
                Name = name,
                Timestamp = DateTime.UtcNow.ToString("o"),
            },
        };

    private static BatchPingItem Ping(string sessionId) =>
        new()
        {
            Payload = new PingSessionRequest
            {
                SessionId = sessionId,
                Timestamp = DateTime.UtcNow.ToString("o"),
            },
        };
}
