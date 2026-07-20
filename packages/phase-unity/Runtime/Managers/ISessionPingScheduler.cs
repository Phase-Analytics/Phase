using System;
using System.Threading.Tasks;

namespace Phase.Analytics.Managers;

public interface ISessionPingScheduler
{
    void Start(Func<Task> onTick, DateTimeOffset sessionStartedAt);

    void NotifyActivity();

    void Stop();
}
