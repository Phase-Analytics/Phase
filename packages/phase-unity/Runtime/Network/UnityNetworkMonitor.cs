using System;
using System.Threading.Tasks;
#if UNITY_5_3_OR_NEWER
using UnityEngine;
#endif

namespace Phase.Analytics.Network;

public sealed class UnityNetworkMonitor : INetworkMonitor
{
    private const float PollIntervalSeconds = 2f;

#if UNITY_5_3_OR_NEWER
    private NetworkState _lastState = new() { IsConnected = true };
    private Action<NetworkState>? _listener;
    private float _lastPollTime;
#endif

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
        _lastState = new NetworkState { IsConnected = IsReachable() };
        listener(_lastState);
        return new Subscription(() => _listener = null);
#else
        listener(new NetworkState { IsConnected = true });
        return new Subscription(() => { });
#endif
    }

    public void Dispose()
    {
    }

#if UNITY_5_3_OR_NEWER
    internal void PollIfDue()
    {
        var now = Time.realtimeSinceStartup;
        if (now - _lastPollTime < PollIntervalSeconds)
        {
            return;
        }

        _lastPollTime = now;
        Poll();
    }

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
