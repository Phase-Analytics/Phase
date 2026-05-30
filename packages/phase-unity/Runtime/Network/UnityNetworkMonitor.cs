using System;
using System.Threading;
using System.Threading.Tasks;
#if UNITY_5_3_OR_NEWER
using UnityEngine;
#endif

namespace Phase.Analytics.Network;

public sealed class UnityNetworkMonitor : INetworkMonitor
{
    private const int PollIntervalMs = 2000;

#if UNITY_5_3_OR_NEWER
    private readonly Timer _pollTimer;
    private NetworkState _lastState = new() { IsConnected = true };
    private Action<NetworkState>? _listener;
#endif

    public UnityNetworkMonitor()
    {
#if UNITY_5_3_OR_NEWER
        _lastState = new NetworkState { IsConnected = IsReachable() };
        _pollTimer = new Timer(_ => Poll(), null, PollIntervalMs, PollIntervalMs);
#endif
    }

    public Task<NetworkState> FetchNetworkStateAsync()
    {
#if UNITY_5_3_OR_NEWER
        return Task.FromResult(new NetworkState { IsConnected = IsReachable() });
#else
        return Task.FromResult(new NetworkState { IsConnected = true });
#endif
    }

    public IDisposable Subscribe(Action<NetworkState> listener)
    {
#if UNITY_5_3_OR_NEWER
        _listener = listener;
        listener(_lastState);
        return new Subscription(() => _listener = null);
#else
        listener(new NetworkState { IsConnected = true });
        return new Subscription(() => { });
#endif
    }

    public void Dispose()
    {
#if UNITY_5_3_OR_NEWER
        _pollTimer.Dispose();
#endif
    }

#if UNITY_5_3_OR_NEWER
    private void Poll()
    {
        var next = new NetworkState { IsConnected = IsReachable() };
        if (next.IsConnected == _lastState.IsConnected)
        {
            return;
        }

        _lastState = next;
        _listener?.Invoke(next);
    }

    private static bool IsReachable() =>
        Application.internetReachability != NetworkReachability.NotReachable;
#endif

    private sealed class Subscription : IDisposable
    {
        private readonly Action _onDispose;

        public Subscription(Action onDispose)
        {
            _onDispose = onDispose;
        }

        public void Dispose()
        {
            _onDispose();
        }
    }
}
