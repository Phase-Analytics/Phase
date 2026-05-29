using System;
using System.Threading;
using System.Threading.Tasks;
using Phase.Analytics.Constants;
using Phase.Analytics.Utils;

namespace Phase.Analytics.Managers;

public sealed class TimerSessionPingScheduler : ISessionPingScheduler, IDisposable
{
    private Timer? _timer;

    public void Start(Func<Task> onTick)
    {
        Stop();
        _timer = new Timer(
            async _ =>
            {
                try
                {
                    await onTick().ConfigureAwait(false);
                }
                catch (Exception error)
                {
                    Logger.Error("Unhandled error in session ping.", error);
                }
            },
            null,
            ValidationConstants.PingIntervalMs,
            ValidationConstants.PingIntervalMs
        );
    }

    public void Stop()
    {
        _timer?.Dispose();
        _timer = null;
    }

    public void Dispose()
    {
        Stop();
    }
}
