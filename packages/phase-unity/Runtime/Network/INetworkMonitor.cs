using System;
using System.Threading.Tasks;

namespace Phase.Analytics.Network;

public interface INetworkMonitor : IDisposable
{
    Task<NetworkState> FetchNetworkStateAsync();

    IDisposable Subscribe(Action<NetworkState> listener);
}
