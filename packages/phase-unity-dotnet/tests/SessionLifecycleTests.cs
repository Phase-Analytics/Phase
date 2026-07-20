using System.Reflection;
using Phase.Analytics.Client;
using Phase.Analytics.Constants;
using Phase.Analytics.Managers;
using Phase.Analytics.Queue;
using Phase.Analytics.Storage;

namespace Phase.Analytics.Tests;

[Collection("PhaseAnalyticsStorage")]
public sealed class SessionLifecycleTests
{
    [Fact]
    public async Task Resume_after_long_pause_starts_new_session()
    {
        var context = await CreateSessionContextAsync();
        var firstSession = await context.SessionManager.StartAsync(isOnline: true);

        context.SessionManager.Pause();
        SetPausedAt(context.SessionManager, DateTimeOffset.UtcNow.AddMinutes(-6));

        await context.SessionManager.ResumeAsync();

        var secondSession = context.SessionManager.GetSessionId();
        Assert.NotNull(secondSession);
        Assert.NotEqual(firstSession, secondSession);
    }

    [Fact]
    public async Task Resume_after_old_session_age_starts_new_session()
    {
        var context = await CreateSessionContextAsync();
        var firstSession = await context.SessionManager.StartAsync(isOnline: true);

        await StorageService.SetItemAsync(
            StorageKeys.SessionStartedAt,
            DateTime.UtcNow.AddHours(-3).ToString("o")
        );

        await context.SessionManager.ResumeAsync();

        Assert.NotEqual(firstSession, context.SessionManager.GetSessionId());
    }

    [Fact]
    public async Task Pause_stops_ping_requests()
    {
        var transport = new RecordingTransport();
        var context = await CreateSessionContextAsync(transport);
        await context.SessionManager.StartAsync(isOnline: true);

        var pingScheduler = new ManualPingScheduler();
        var pingSessionManager = new SessionManager(
            context.Client,
            context.Queue,
            "01HXTESTDEVICE0000000001",
            pingScheduler
        );
        await pingSessionManager.StartAsync(isOnline: true);
        await pingScheduler.TriggerPingAsync();
        var requestsBeforePause = transport.PingRequestCount;

        pingSessionManager.Pause();
        await pingScheduler.TriggerPingAsync();

        Assert.Equal(requestsBeforePause, transport.PingRequestCount);
    }

    private static async Task<SessionContext> CreateSessionContextAsync(
        RecordingTransport? transport = null
    )
    {
        var storage = new FileStorage(
            Path.Combine(
                Path.GetTempPath(),
                "phase-unity-session-tests",
                Guid.NewGuid().ToString("N")
            )
        );
        StorageService.SetAdapter(storage);

        transport ??= new RecordingTransport();
        var client = new SdkHttpClient("phase_test_key", transport);
        var queue = new OfflineQueue();
        await queue.InitializeAsync();

        return new SessionContext(client, queue, transport);
    }

    private static void SetPausedAt(SessionManager sessionManager, DateTimeOffset pausedAt)
    {
        var field = typeof(SessionManager).GetField(
            "_pausedAtMs",
            BindingFlags.Instance | BindingFlags.NonPublic
        );
        Assert.NotNull(field);
        field.SetValue(sessionManager, pausedAt.ToUnixTimeMilliseconds());
    }

    private sealed class SessionContext
    {
        public SessionContext(
            SdkHttpClient client,
            OfflineQueue queue,
            RecordingTransport transport
        )
        {
            Client = client;
            Queue = queue;
            Transport = transport;
            SessionManager = new SessionManager(client, queue, "01HXTESTDEVICE0000000001");
        }

        public SdkHttpClient Client { get; }

        public OfflineQueue Queue { get; }

        public RecordingTransport Transport { get; }

        public SessionManager SessionManager { get; }
    }

    private sealed class RecordingTransport : IHttpTransport
    {
        public int PingRequestCount { get; private set; }

        public Task<HttpTransportResponse> SendAsync(
            HttpTransportRequest request,
            CancellationToken cancellationToken
        )
        {
            if (request.Url.EndsWith("/sdk/sessions"))
            {
                return Task.FromResult(
                    new HttpTransportResponse(
                        200,
                        """{"sessionId":"01HXTESTSESSION000000001","deviceId":"01HXTESTDEVICE0000000001","startedAt":"2026-01-01T00:00:00Z","lastActivityAt":"2026-01-01T00:00:00Z"}"""
                    )
                );
            }

            if (request.Url.EndsWith("/sdk/ping"))
            {
                PingRequestCount++;
                return Task.FromResult(
                    new HttpTransportResponse(
                        200,
                        """{"sessionId":"01HXTESTSESSION000000001","lastActivityAt":"2026-01-01T00:00:00Z"}"""
                    )
                );
            }

            return Task.FromResult(new HttpTransportResponse(404, "not found"));
        }
    }

    private sealed class ManualPingScheduler : ISessionPingScheduler
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
}
