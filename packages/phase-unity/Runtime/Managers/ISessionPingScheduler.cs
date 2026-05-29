using System;
using System.Threading.Tasks;

namespace Phase.Analytics.Managers;

public interface ISessionPingScheduler
{
    void Start(Func<Task> onTick);

    void Stop();
}
