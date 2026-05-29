using System;
using System.Threading.Tasks;

namespace Phase.Analytics.Network;

public sealed class AlwaysOnlineNetworkMonitor : INetworkMonitor
{
    public Task<NetworkState> FetchNetworkStateAsync() =>
        Task.FromResult(new NetworkState { IsConnected = true });

    public IDisposable Subscribe(Action<NetworkState> listener) => EmptyDisposable.Instance;

    public void Dispose()
    {
    }

    private sealed class EmptyDisposable : IDisposable
    {
        public static readonly EmptyDisposable Instance = new();

        public void Dispose()
        {
        }
    }
}
