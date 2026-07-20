using System;
using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Managers;

public sealed class TimerSessionPingScheduler : ISessionPingScheduler, IDisposable
{
    private static readonly TimeSpan InitialHeartbeatInterval = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan ExtendedHeartbeatInterval = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan LongHeartbeatInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan ExtendedHeartbeatAt = TimeSpan.FromMinutes(3);
    private static readonly TimeSpan LongHeartbeatAt = TimeSpan.FromMinutes(5);

    private readonly object _sync = new();
    private Timer? _timer;
    private Func<Task>? _onTick;
    private DateTimeOffset _sessionStartedAt;
    private long _scheduleVersion;

    public void Start(Func<Task> onTick, DateTimeOffset sessionStartedAt)
    {
        if (onTick == null)
        {
            throw new ArgumentNullException(nameof(onTick));
        }

        lock (_sync)
        {
            StopLocked();
            _onTick = onTick;
            _sessionStartedAt = sessionStartedAt;
            ScheduleNextLocked(GetHeartbeatInterval());
        }
    }

    public void NotifyActivity()
    {
        lock (_sync)
        {
            if (_onTick == null)
            {
                return;
            }

            ScheduleNextLocked(GetHeartbeatInterval());
        }
    }

    public void Stop()
    {
        lock (_sync)
        {
            StopLocked();
        }
    }

    public void Dispose()
    {
        Stop();
    }

    private void ScheduleNextLocked(TimeSpan delay)
    {
        _scheduleVersion++;
        _timer ??= new Timer(OnTimerElapsed);
        _timer.Change(delay, Timeout.InfiniteTimeSpan);
    }

    private void OnTimerElapsed(object? state)
    {
        Func<Task>? onTick;
        long scheduleVersion;

        lock (_sync)
        {
            onTick = _onTick;
            scheduleVersion = _scheduleVersion;
        }

        if (onTick == null)
        {
            return;
        }

        _ = RunTickAsync(onTick, scheduleVersion);
    }

    private async Task RunTickAsync(Func<Task> onTick, long scheduleVersion)
    {
        try
        {
            await onTick().ConfigureAwait(false);
        }
        catch (Exception error)
        {
            Logger.Error("Unhandled error in session ping.", error);
        }
        finally
        {
            lock (_sync)
            {
                if (_onTick != null && scheduleVersion == _scheduleVersion)
                {
                    ScheduleNextLocked(GetHeartbeatInterval());
                }
            }
        }
    }

    private TimeSpan GetHeartbeatInterval()
    {
        var sessionAge = DateTimeOffset.UtcNow - _sessionStartedAt;
        if (sessionAge >= LongHeartbeatAt)
        {
            return LongHeartbeatInterval;
        }

        if (sessionAge >= ExtendedHeartbeatAt)
        {
            return ExtendedHeartbeatInterval;
        }

        return InitialHeartbeatInterval;
    }

    private void StopLocked()
    {
        _scheduleVersion++;
        _timer?.Dispose();
        _timer = null;
        _onTick = null;
    }
}
