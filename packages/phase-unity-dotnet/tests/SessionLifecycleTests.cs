using System.Reflection;
using Phase.Analytics.Managers;
using Phase.Analytics.Models;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;

namespace Phase.Analytics.Tests;

[Collection("PhaseAnalyticsStorage")]
public sealed class SessionLifecycleTests : IDisposable
{
    private const string DeviceId = "01HXTESTDEVICE0000000001";

    private readonly List<OfflineQueue> _queues = new();

    public void Dispose()
    {
        foreach (var queue in _queues)
        {
            queue.Dispose();
        }
    }

    [Fact]
    public async Task Resume_after_long_pause_starts_new_session()
    {
        using var sessionManager = await CreateSessionManagerAsync();
        var firstSession = sessionManager.Start();

        sessionManager.Pause();
        SetField(sessionManager, "_pausedAtMs", DateTimeOffset.UtcNow.AddMinutes(-6).ToUnixTimeMilliseconds());

        sessionManager.Resume();

        var secondSession = sessionManager.GetSessionId();
        Assert.NotNull(secondSession);
        Assert.NotEqual(firstSession, secondSession);
    }

    [Fact]
    public async Task Resume_after_old_session_age_starts_new_session()
    {
        using var sessionManager = await CreateSessionManagerAsync();
        var firstSession = sessionManager.Start();

        SetField(sessionManager, "_startedAt", (DateTime?)DateTime.UtcNow.AddHours(-3));

        sessionManager.Resume();

        Assert.NotEqual(firstSession, sessionManager.GetSessionId());
    }

    [Fact]
    public async Task Pause_stops_pings()
    {
        var queue = await CreateQueueAsync();
        var pingScheduler = new ManualPingScheduler();
        using var sessionManager = new SessionManager(queue, () => DeviceId, pingScheduler);
        sessionManager.Start();

        sessionManager.Pause();
        await pingScheduler.TriggerPingAsync();

        Assert.DoesNotContain(queue.PeekBatch(10), item => item is BatchPingItem);
    }

    private async Task<SessionManager> CreateSessionManagerAsync() =>
        new(await CreateQueueAsync(), () => DeviceId, new ManualPingScheduler());

    private async Task<OfflineQueue> CreateQueueAsync()
    {
        StorageService.SetAdapter(
            new FileStorage(
                Path.Combine(Path.GetTempPath(), "phase-unity-session-tests", Guid.NewGuid().ToString("N"))
            )
        );

        var queue = new OfflineQueue();
        _queues.Add(queue);
        await queue.InitializeAsync();
        return queue;
    }

    private static void SetField(SessionManager sessionManager, string name, object? value)
    {
        var field = typeof(SessionManager).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic);
        Assert.NotNull(field);
        field.SetValue(sessionManager, value);
    }
}
